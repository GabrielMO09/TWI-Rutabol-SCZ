import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { MemoryService } from '../micros/memory.service';
import { PersistenceService } from '../persistence/persistence.service';
import { sessionCookieAuthorization } from '../shared/session-cookie';

const USER_ID = '7654321';
const LOGIN = '/api/auth/login/passenger';
const RECOVERY_REQUEST = '/api/auth/recovery/request';
const RECOVERY_CONFIRM = '/api/auth/recovery/confirm';
const MINUTE = 60_000;

describe('Límites de autenticación HTTP', () => {
  let app: INestApplication;
  let memory: MemoryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(PersistenceService).useValue({ sync: async () => {} })
      .compile();
    app = module.createNestApplication();
    app.use(sessionCookieAuthorization);
    await app.init();
    memory = app.get(MemoryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    memory?.loginAttempts.clear();
    memory?.loginAccountAttempts.clear();
    memory?.recoveryCodes.clear();
    memory?.recoveryRequests.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  function login(password: string) {
    return request(app.getHttpServer()).post(LOGIN).send({ id: USER_ID, password });
  }

  function requestCode() {
    return request(app.getHttpServer()).post(RECOVERY_REQUEST).send({ id: USER_ID }).expect(201);
  }

  it('rechaza el sexto fallo y duplica la espera en el segundo bloqueo', async () => {
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    const fail = () => login('incorrecta');

    for (let index = 0; index < 4; index += 1) await fail().expect(401);
    await fail().expect(429);
    const sixth = await fail().expect(429);
    expect(sixth.body.message).toBe('Demasiados intentos. Intenta de nuevo en 5 minutos.');
    const [key] = memory.loginAttempts.keys();
    expect(key).toMatch(/^pasajero:7654321:(?:127\.0\.0\.1|::ffff:127\.0\.0\.1|::1)$/);
    expect(memory.loginAttempts.get(key)).toMatchObject({
      strikes: 1, blockedUntil: start + 5 * MINUTE,
    });

    const secondStart = start + 5 * MINUTE;
    clock.mockReturnValue(secondStart);
    memory.tick();
    for (let index = 0; index < 4; index += 1) await fail().expect(401);
    const secondBlock = await fail().expect(429);
    expect(secondBlock.body.message).toBe('Demasiados intentos. Intenta de nuevo en 10 minutos.');
    expect(memory.loginAttempts.get(key)).toMatchObject({
      strikes: 2, blockedUntil: secondStart + 10 * MINUTE,
    });

    clock.mockReturnValue(secondStart + 9 * MINUTE);
    const lastMinute = await fail().expect(429);
    expect(lastMinute.body.message).toBe('Demasiados intentos. Intenta de nuevo en 1 minuto.');

    clock.mockReturnValue(secondStart + 10 * MINUTE);
    await login('123456').expect(201);
    expect(memory.loginAttempts.has(key)).toBe(false);
  });

  it('conserva el código vigente en la cuarta solicitud de la misma cuenta en una hora', async () => {
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    for (let index = 0; index < 3; index += 1) {
      const response = await requestCode();
      expect(response.body.devCode).toMatch(/^\d{6}$/);
    }
    const saved = memory.recoveryCodes.get(USER_ID);
    const fourth = await requestCode();
    expect(fourth.body).toEqual({ sent: true });
    expect(memory.recoveryCodes.get(USER_ID)).toBe(saved);

    clock.mockReturnValue(start + 60 * MINUTE);
    const next = await requestCode();
    expect(next.body.devCode).toMatch(/^\d{6}$/);
    expect(memory.recoveryCodes.get(USER_ID)).not.toBe(saved);
  });

  it('elimina el código al quinto fallo y suspende nuevas emisiones durante 15 minutos', async () => {
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    const issued = await requestCode();
    const wrongCode = issued.body.devCode === '000000' ? '000001' : '000000';

    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer()).post(RECOVERY_CONFIRM)
        .send({ id: USER_ID, code: wrongCode, newPassword: 'nueva123' }).expect(400);
    }
    expect(memory.recoveryCodes.has(USER_ID)).toBe(false);
    expect((await requestCode()).body).toEqual({ sent: true });

    clock.mockReturnValue(start + 15 * MINUTE - 1);
    memory.tick();
    expect((await requestCode()).body).toEqual({ sent: true });
    expect(memory.recoveryCodes.has(USER_ID)).toBe(false);

    clock.mockReturnValue(start + 15 * MINUTE);
    const next = await requestCode();
    expect(next.body.devCode).toMatch(/^\d{6}$/);
    expect(memory.recoveryCodes.has(USER_ID)).toBe(true);
  });

  it('devuelve el perfil en el cuerpo y la sesión en una cookie HttpOnly', async () => {
    const response = await login('123456').expect(201);
    expect(response.body).toEqual({ profile: expect.objectContaining({ userId: USER_ID }) });
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies).toEqual(expect.arrayContaining([
      expect.stringMatching(/^rutabol_sid=[\w-]{43}; HttpOnly;/),
    ]));
  });
});
