import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { fixture } from '../test-support';
import { RolesGuard } from './roles.guard';

describe('AuthService', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it.each([
    ['pasajero', { id: '7654321', password: 'incorrecta' }],
    ['chofer', { line: '17', internal: '045', pin: '0000' }],
    ['control', { id: 'control@rutabol.bo', password: 'incorrecta' }],
  ])('bloquea el quinto fallo de %s durante cinco minutos', async (role, body) => {
    const login = () => role === 'pasajero'
      ? context.auth.loginPassenger(body)
      : role === 'chofer'
        ? context.auth.loginDriver(body)
        : context.auth.loginControl(body);
    for (let index = 0; index < 4; index += 1) {
      await expect(login()).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(login()).rejects.toMatchObject({ status: 429 });
    await expect(login()).rejects.toThrow('Demasiados intentos. Intenta de nuevo en 5 minutos.');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 300001);
    await expect(login()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza cuentas suspendidas al iniciar sesión y al usar una sesión existente', async () => {
    const result = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    context.memory.users.get('7654321')!.profile.status = 'suspendido';
    await expect(context.auth.loginPassenger({
      id: '7654321', password: '123456',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => context.auth.resolve(`Bearer ${result.token}`)).toThrow(
      'Tu cuenta está suspendida. Contacta al Centro de Control.',
    );
  });

  it('requiere términos y registra acreditación pendiente con código universitario', async () => {
    const body = {
      name: 'Ana Pérez',
      category: 'universitario',
      code: 'ANA@upds.edu.bo',
      password: '123456',
      photo: 'foto',
      institution: 'UPDS',
    };
    await expect(context.auth.register(body)).rejects.toThrow(
      'Debes aceptar los términos y la política de privacidad.',
    );
    const result = await context.auth.register({ ...body, acceptTerms: true });
    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(result.profile).toMatchObject({
      fareCategory: 'general',
      accreditation: { status: 'pendiente', emailVerified: false },
    });
    await expect(context.auth.register({
      ...body, code: 'ana@upds.edu.bo', acceptTerms: true,
    })).rejects.toMatchObject({ status: 409 });
  });

  it('rota, lista, revoca y expira sesiones a las ocho horas', async () => {
    const first = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    const bearer = `Bearer ${first.token}`;
    const sessions = context.auth.sessions(bearer);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].current).toBe(true);
    expect(sessions[0]).not.toHaveProperty('token');
    const refreshed = context.auth.refresh(bearer);
    expect(() => context.auth.resolve(bearer)).toThrow(UnauthorizedException);
    const nextBearer = `Bearer ${refreshed.token}`;
    const current = context.auth.sessions(nextBearer)[0];
    context.auth.revokeSession(current.id, nextBearer);
    expect(() => context.auth.resolve(nextBearer)).toThrow(UnauthorizedException);

    const expiring = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 8 * 3600000);
    expect(() => context.auth.resolve(`Bearer ${expiring.token}`)).toThrow('La sesión expiró.');
  });

  it('recupera contraseña una sola vez y revoca sesiones', async () => {
    const login = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    expect(context.auth.recoveryRequest({ id: 'desconocido' })).toEqual({ sent: true });
    const recovery = context.auth.recoveryRequest({ id: '7654321' });
    await context.auth.recoveryConfirm({
      id: '7654321', code: recovery.devCode, newPassword: 'nueva123',
    });
    expect(() => context.auth.resolve(`Bearer ${login.token}`)).toThrow(UnauthorizedException);
    await expect(context.auth.recoveryConfirm({
      id: '7654321', code: recovery.devCode, newPassword: 'otra123',
    })).rejects.toBeInstanceOf(HttpException);
    await expect(context.auth.loginPassenger({
      id: '7654321', password: 'nueva123',
    })).resolves.toHaveProperty('token');
  });

  it('actualiza perfil y contraseña sin aceptar cambios de rol', async () => {
    const login = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    const bearer = `Bearer ${login.token}`;
    expect(context.auth.updateProfile({
      name: 'Ana Pérez', role: 'control',
    }, bearer)).toMatchObject({ name: 'Ana Pérez', role: 'pasajero' });
    await expect(context.auth.changePassword({
      current: 'incorrecta', next: 'nueva123',
    }, bearer)).rejects.toBeInstanceOf(UnauthorizedException);
    await context.auth.changePassword({ current: '123456', next: 'nueva123' }, bearer);
    expect(() => context.auth.resolve(bearer)).toThrow(UnauthorizedException);
  });

  it('audita cada intento de control', async () => {
    await expect(context.auth.loginControl({
      id: 'control@rutabol.bo', password: 'incorrecta',
    })).rejects.toThrow();
    await context.auth.loginControl({ id: 'control@rutabol.bo', password: 'control123' });
    expect(context.memory.audit.map((item) => item.result)).toEqual(['error', 'ok']);
  });

  it('el guard adjunta perfil y sesión y rechaza otro rol', async () => {
    const login = await context.auth.loginPassenger({ id: '7654321', password: '123456' });
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${login.token}` },
    };
    const execution = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;
    const reflector = new Reflector();
    const metadata = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['pasajero']);
    const guard = new RolesGuard(context.auth, reflector);
    expect(guard.canActivate(execution)).toBe(true);
    expect(request.profile).toMatchObject({ userId: '7654321' });
    expect(request.session).toHaveProperty('id');
    metadata.mockReturnValue(['control']);
    expect(() => guard.canActivate(execution)).toThrow(ForbiddenException);
  });
});
