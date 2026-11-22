import { CredentialsService } from '../credentials/credentials.service';
import { password } from '../micros/input';
import { ACCOUNT_CONFLICT } from '../shared/accreditation.service';
import { EventsService } from '../shared/events.service';
import * as security from '../shared/security';
import { fixture } from '../test-support';

const USER_ID = '7654321';
const VALID_LOGIN = { id: USER_ID, password: '123456' };
const INVALID_LOGIN = { id: USER_ID, password: 'incorrecta' };

describe('Robustez de autenticación y credenciales', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('limita el bloqueo progresivo a la IP que falló', async () => {
    const ip = '192.0.2.1';
    for (let index = 0; index < 4; index += 1) {
      await expect(context.auth.loginPassenger(INVALID_LOGIN, ip))
        .rejects.toMatchObject({ status: 401 });
    }
    await expect(context.auth.loginPassenger(INVALID_LOGIN, ip))
      .rejects.toMatchObject({ status: 429 });
    await expect(context.auth.loginPassenger(VALID_LOGIN, ip))
      .rejects.toMatchObject({ status: 429 });
    await expect(context.auth.loginPassenger(VALID_LOGIN, '192.0.2.2'))
      .resolves.toHaveProperty('token');
  });

  it('bloquea la cuenta durante 15 minutos tras 50 fallos desde distintas IP', async () => {
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    const compare = jest.spyOn(security, 'matchesPassword').mockResolvedValue(false);
    for (let index = 1; index < 50; index += 1) {
      await expect(context.auth.loginPassenger(INVALID_LOGIN, `192.0.2.${index}`))
        .rejects.toMatchObject({ status: 401 });
    }
    await expect(context.auth.loginPassenger(INVALID_LOGIN, '192.0.2.50'))
      .rejects.toMatchObject({ status: 429 });
    compare.mockRestore();

    const newIp = '192.0.2.51';
    await expect(context.auth.loginPassenger(VALID_LOGIN, newIp)).rejects.toMatchObject({
      status: 429, message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    });
    clock.mockReturnValue(start + 15 * 60_000 - 1);
    await expect(context.auth.loginPassenger(VALID_LOGIN, newIp))
      .rejects.toMatchObject({ status: 429 });
    clock.mockReturnValue(start + 15 * 60_000);
    context.memory.tick();
    expect(context.memory.loginAccountAttempts.has(`pasajero:${USER_ID}`)).toBe(false);
    await expect(context.auth.loginPassenger(VALID_LOGIN, newIp)).resolves.toHaveProperty('token');
  });

  it.each(['Clave-A', '12345678'])('rechaza la contraseña %s', (value) => {
    expect(() => password(value)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('verifica el candidato contra el mismo secreto ficticio en cuentas inexistentes', async () => {
    const compare = jest.spyOn(security, 'matchesPassword');
    const candidate = 'clave-incorrecta';

    for (const id of ['desconocido-uno', 'desconocido-dos']) {
      await expect(context.auth.loginPassenger({ id, password: candidate }))
        .rejects.toMatchObject({ status: 401 });
    }

    expect(compare).toHaveBeenCalledTimes(2);
    const [secret] = compare.mock.calls[0];
    expect(compare).toHaveBeenNthCalledWith(1, expect.any(Promise), candidate);
    expect(compare).toHaveBeenNthCalledWith(2, secret, candidate);
  });

  it('permite al chofer cambiar su PIN a otro de cuatro dígitos', async () => {
    const driver = { line: '17', internal: '045', pin: '1234' };
    const { token } = await context.auth.loginDriver(driver);
    await expect(context.auth.changePassword({ current: driver.pin, next: '4321' }, `Bearer ${token}`))
      .resolves.toEqual({ ok: true });
    await expect(context.auth.loginDriver({ ...driver, pin: '4321' }))
      .resolves.toHaveProperty('token');
  });

  it('omite la recuperación si el identificador coincide con dos roles', () => {
    context.memory.users.get('control@rutabol.bo')!.profile.email = USER_ID;

    expect(context.auth.recoveryRequest({ id: USER_ID })).toEqual({ sent: true });
    expect(context.memory.recoveryCodes.size).toBe(0);
    expect(context.memory.recoveryRequests.size).toBe(0);
  });

  it('rechaza con 409 un código de registro que coincide con el busId de un chofer', async () => {
    const busId = context.memory.users.get('chofer:17-045')!.profile.busId;

    await expect(context.auth.register({
      name: 'Ana Pérez',
      category: 'escolar',
      ci: '8154321',
      email: 'ana@example.com',
      phone: '71234567',
      code: busId,
      password: 'clave-Ana42',
      passwordConfirmation: 'clave-Ana42',
      photo: 'data:image/jpeg;base64,/9j/2Q==',
      acceptTerms: true,
    })).rejects.toMatchObject({ status: 409, message: ACCOUNT_CONFLICT });
  });

  it('exige CREDENTIAL_SECRET en producción', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousSecret = process.env.CREDENTIAL_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.CREDENTIAL_SECRET;
      expect(() => new CredentialsService(context.memory, context.accreditation))
        .toThrow('Debes definir CREDENTIAL_SECRET para emitir credenciales en producción.');
    } finally {
      if (previousEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnv;
      if (previousSecret === undefined) delete process.env.CREDENTIAL_SECRET;
      else process.env.CREDENTIAL_SECRET = previousSecret;
    }
  });
});

describe('Límites SSE', () => {
  let events: EventsService;

  beforeEach(() => {
    events = new EventsService();
  });

  afterEach(() => {
    events.onModuleDestroy();
    jest.useRealTimers();
  });

  it('rechaza con 429 la conexión 21 de una IP y libera el cupo al desconectar', () => {
    const stream = events.connect('192.0.2.1');
    const active = Array.from({ length: 20 }, () => stream.subscribe());
    const onError = jest.fn();

    expect(stream.subscribe({ error: onError }).closed).toBe(true);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 429 }));
    expect(events.connect('192.0.2.2').subscribe().closed).toBe(false);

    active[0].unsubscribe();
    expect(stream.subscribe({ error: onError }).closed).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('agrupa emisiones durante 300 ms y cancela el tick pendiente al cerrar', () => {
    jest.useFakeTimers();
    const onTick = jest.fn();
    events.connect('192.0.2.1').subscribe(onTick);

    events.emit();
    jest.advanceTimersByTime(299);
    events.emit();
    expect(onTick).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledWith({ data: { type: 'tick' } });

    events.emit();
    jest.advanceTimersByTime(300);
    expect(onTick).toHaveBeenCalledTimes(2);

    events.emit();
    events.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
