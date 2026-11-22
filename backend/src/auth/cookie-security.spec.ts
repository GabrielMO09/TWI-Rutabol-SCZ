import { validateHeaderValue } from 'node:http';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { MemoryService } from '../micros/memory.service';
import { PersistenceService } from '../persistence/persistence.service';
import { InputPipe } from '../shared/input.pipe';
import { sessionCookieAuthorization } from '../shared/session-cookie';

const FRONTEND_ORIGIN = 'https://app.example.test';
const OTHER_ORIGIN = 'https://other.example.test';
const LOGIN = '/api/auth/login/passenger';
const ME = '/api/auth/me';
const EIGHT_HOURS = 28_800;

function sessionCookie(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((cookie) => cookie.startsWith('rutabol_sid=')) ?? '';
}

function cookiePair(response: Response): string {
  const [pair] = sessionCookie(response).split(';');
  expect(pair).toMatch(/^rutabol_sid=[A-Za-z0-9_-]{43}$/);
  return pair;
}

function expectNoStore(response: Response): void {
  expect(response.headers['cache-control'] ?? '').toMatch(
    /(?:^|,)\s*no-store\s*(?:,|$)/i,
  );
}

describe('Seguridad HTTP de rutabol_sid', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(PersistenceService).useValue({ sync: async () => {} })
      .compile();

    app = module.createNestApplication<NestExpressApplication>();
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(sessionCookieAuthorization);
    app.useGlobalPipes(new InputPipe());
    app.useBodyParser('json', { limit: '5mb' });
    app.enableCors({ origin: FRONTEND_ORIGIN, credentials: true });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  function client() {
    return request(app.getHttpServer());
  }

  function login(previousCookie?: string) {
    const call = client().post(LOGIN);
    if (previousCookie) call.set('Cookie', previousCookie);
    return call.send({ id: '7654321', password: '123456' }).expect(201);
  }

  it('emite HttpOnly, SameSite=Lax, Path=/ y Max-Age coherente con la sesión', async () => {
    const response = await login();
    const pair = cookiePair(response);
    expect(sessionCookie(response)).toBe(
      `${pair}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${EIGHT_HOURS}`,
    );

    const { body } = await client().get('/api/auth/sessions')
      .set('Cookie', pair)
      .expect(200);
    const current = body.find((session: { current: boolean }) => session.current);
    expect(current).toBeDefined();
    expect(current.expiresAt - current.createdAt).toBe(EIGHT_HOURS * 1000);
  });

  it('añade Secure a la cookie en producción', async () => {
    const previousEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const response = await login();
      expect(sessionCookie(response)).toBe(
        `${cookiePair(response)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${EIGHT_HOURS}; Secure`,
      );
    } finally {
      if (previousEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnv;
    }
  });

  it('genera un token nuevo con cada login, incluso si recibe una sesión válida', async () => {
    const previous = cookiePair(await login());
    const next = cookiePair(await login(previous));

    expect(next).not.toBe(previous);
    await client().get(ME).set('Cookie', next).expect(200);
  });

  it('invalida la sesión presentada al volver a iniciar sesión', async () => {
    const previous = cookiePair(await login());
    await login(previous);

    await client().get(ME).set('Cookie', previous).expect(401);
  });

  it('invalida la sesión presentada como Bearer al volver a iniciar sesión', async () => {
    const previous = cookiePair(await login());
    const authorization = `Bearer ${previous.slice('rutabol_sid='.length)}`;
    const response = await client().post(LOGIN).set('Authorization', authorization)
      .send({ id: '7654321', password: '123456' }).expect(201);

    await client().get(ME).set('Authorization', authorization).expect(401);
    await client().get(ME).set('Cookie', cookiePair(response)).expect(200);
  });

  it('ignora una sesión inválida al iniciar sesión', async () => {
    const next = cookiePair(await login('rutabol_sid=invalido'));
    await client().get(ME).set('Cookie', next).expect(200);
  });

  it('rota el token en refresh e invalida el anterior', async () => {
    const previous = cookiePair(await login());
    const response = await client().post('/api/auth/refresh')
      .set('Cookie', previous)
      .expect(201);
    const next = cookiePair(response);

    expect(next).not.toBe(previous);
    expect(sessionCookie(response)).toContain(`Max-Age=${EIGHT_HOURS}`);
    await client().get(ME).set('Cookie', previous).expect(401);
    await client().get(ME).set('Cookie', next).expect(200);
  });

  it('expira la cookie en logout e invalida el token en el servidor', async () => {
    const previous = cookiePair(await login());
    const response = await client().post('/api/auth/logout')
      .set('Cookie', previous)
      .expect(201);

    expect(sessionCookie(response)).toBe(
      'rutabol_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    );
    await client().get(ME).set('Cookie', previous).expect(401);
    await client().get(ME)
      .set('Authorization', `Bearer ${previous.slice('rutabol_sid='.length)}`)
      .expect(401);
  });

  it('rechaza un token manipulado, vacío o entre comillas', async () => {
    const pair = cookiePair(await login());
    const token = pair.slice('rutabol_sid='.length);
    const changed = `${token[0] === 'A' ? 'B' : 'A'}${token.slice(1)}`;

    for (const cookie of [
      `rutabol_sid=${changed}`,
      'rutabol_sid=',
      `rutabol_sid="${token}"`,
    ]) {
      await client().get(ME).set('Cookie', cookie).expect(401);
    }
  });

  it('da prioridad a la cookie sin recurrir a Bearer si la cookie está vacía', async () => {
    const pair = cookiePair(await login());
    const token = pair.slice('rutabol_sid='.length);

    await client().get(ME)
      .set('Cookie', `otra=valor; ${pair}`)
      .set('Authorization', 'Bearer invalido')
      .expect(200);
    await client().get(ME)
      .set('Cookie', 'rutabol_sid=')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  // VULN: el parser selecciona la primera aparición, aunque haya otra cookie de sesión.
  it('rechaza dos cookies de sesión incluso si la primera es válida', async () => {
    const first = cookiePair(await login());
    const second = cookiePair(await login());

    await client().get(ME).set('Cookie', `${first}; ${second}`).expect(401);
  });

  // VULN: la conversión a Bearer permite espacios iniciales en el valor.
  it('rechaza espacios entre el signo igual y el token de sesión', async () => {
    const pair = cookiePair(await login());
    const token = pair.slice('rutabol_sid='.length);

    await client().get(ME).set('Cookie', `rutabol_sid= ${token}`).expect(401);
  });

  it('rechaza CRLF literal como valor de cabecera y no decodifica CRLF en la cookie', async () => {
    const pair = cookiePair(await login());
    expect(() => validateHeaderValue('Cookie', `${pair}\r\nX-Cookie-Test: yes`))
      .toThrow();

    const response = await client().post('/api/auth/refresh')
      .set('Cookie', `${pair}%0D%0AX-Cookie-Test%3A%20yes`)
      .expect(401);

    expect(response.headers['x-cookie-test']).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  // VULN: logout ejecuta la revocación con ambos tipos de contenido simples.
  it.each(['text/plain', 'application/x-www-form-urlencoded'])(
    'rechaza un logout por cookie con Content-Type %s sin revocar la sesión',
    async (contentType) => {
      const pair = cookiePair(await login());
      const response = await client().post('/api/auth/logout')
        .set('Origin', OTHER_ORIGIN)
        .set('Cookie', pair)
        .set('Content-Type', contentType)
        .send('check=1');
      const session = await client().get(ME).set('Cookie', pair);

      expect({ responseStatus: response.status, sessionStatus: session.status }).toEqual({
        responseStatus: expect.any(Number),
        sessionStatus: 200,
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    },
  );

  it('impide la emisión de credenciales mediante GET autenticado por cookie', async () => {
    const pair = cookiePair(await login());
    const credentials = app.get(MemoryService).credentials;
    const before = credentials.size;
    await client().get('/api/credentials/me').set('Cookie', pair).expect(404);

    expect(credentials.size).toBe(before);
  });

  it('emite una credencial mediante POST autenticado por cookie', async () => {
    const pair = cookiePair(await login());
    const { body } = await client().post('/api/credentials/me')
      .set('Cookie', pair)
      .send({})
      .expect(201);

    expect(body.token).toMatch(/^[\w-]+\.[\w-]+$/);
    const [encoded] = body.token.split('.');
    const { n: nonce } = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    expect(app.get(MemoryService).credentials.get(nonce)).toEqual({
      userId: '7654321', expiresAt: body.expiresAt,
    });
  });

  it('habilita solicitudes con credenciales para el origen configurado', async () => {
    const response = await client().options(LOGIN)
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no refleja un origen ajeno ni le concede acceso CORS con credenciales', async () => {
    const pair = cookiePair(await login());
    const responses = await Promise.all([
      client().options(LOGIN)
        .set('Origin', OTHER_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type'),
      client().get(ME).set('Origin', OTHER_ORIGIN).set('Cookie', pair).expect(200),
    ]);

    for (const { headers } of responses) {
      const allowedOrigin = headers['access-control-allow-origin'];
      expect(allowedOrigin).not.toBe(OTHER_ORIGIN);
      expect(allowedOrigin).not.toBe('*');
      // El navegador exige que coincidan el origen y el permiso de credenciales.
      expect(
        allowedOrigin === OTHER_ORIGIN &&
        headers['access-control-allow-credentials'] === 'true',
      ).toBe(false);
    }
  });

  it('entrega el token de sesión únicamente mediante la cookie HttpOnly', async () => {
    const response = await login();

    expect(cookiePair(response)).toMatch(/^rutabol_sid=/);
    expect(response.body).not.toHaveProperty('token');
  });

  // VULN: el login emite Set-Cookie sin Cache-Control: no-store.
  it('impide almacenar la respuesta de login', async () => {
    expectNoStore(await login());
  });

  // VULN: /me devuelve un perfil autenticado sin Cache-Control: no-store.
  it('impide almacenar una respuesta autenticada de perfil', async () => {
    const pair = cookiePair(await login());
    const response = await client().get(ME).set('Cookie', pair).expect(200);

    expectNoStore(response);
  });
});
