import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from './app.module';
import { MemoryService } from './micros/memory.service';
import { DatabaseService } from './database/database.service';
import { PersistenceService } from './persistence/persistence.service';
import { sessionCookieAuthorization } from './shared/session-cookie';

const JPEG_PREFIX = 'data:image/jpeg;base64,';
const JPEG_DATA = `${JPEG_PREFIX}/9j/2Q==`;
const REGISTRATION = {
  name: 'Ana Pérez',
  category: 'general',
  ci: '8154321',
  email: 'ana@example.com',
  phone: '71234567',
  password: 'clave-Ana42',
  passwordConfirmation: 'clave-Ana42',
  acceptTerms: true,
};

function cookiePair(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const pair = cookies?.find((cookie) => cookie.startsWith('rutabol_sid='))?.split(';')[0] ?? '';
  expect(pair).toMatch(/^rutabol_sid=[\w-]{43}$/);
  return pair;
}

describe('Límites de registro y reclamos HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(PersistenceService).useValue({ sync: async () => {} })
      .compile();
    const expressApp = module.createNestApplication<NestExpressApplication>();
    app = expressApp;
    expressApp.use(sessionCookieAuthorization);
    expressApp.useBodyParser('json', { limit: '5mb' });
    await expressApp.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  function register(photo: string) {
    return request(app.getHttpServer()).post('/api/auth/register')
      .send({ ...REGISTRATION, photo });
  }

  async function passengerCookie(id = '7654321'): Promise<string> {
    const response = await request(app.getHttpServer()).post('/api/auth/login/passenger')
      .send({ id, password: '123456' }).expect(201);
    return cookiePair(response);
  }

  function createClaim(cookie: string, evidence?: string) {
    return request(app.getHttpServer()).post('/api/claims')
      .set('Cookie', cookie)
      .send({
        line: '17',
        internal: '045',
        tripAt: Date.now() - 1000,
        description: 'Reclamo de prueba sobre el viaje.',
        evidence,
      });
  }

  it('rechaza una URL externa como fotografía del rostro', async () => {
    const response = await register('https://example.com/foto.jpg').expect(400);
    expect(response.body.message).toContain('La fotografía del rostro');
  });

  it('acepta una fotografía con formato data:image/jpeg en base64', async () => {
    const response = await register(JPEG_DATA).expect(201);
    expect(response.body.profile).toMatchObject({ userId: REGISTRATION.ci, photo: JPEG_DATA });
  });

  it('rechaza una fotografía de 300 000 caracteres', async () => {
    const photo = JPEG_PREFIX + 'A'.repeat(300_000 - JPEG_PREFIX.length);
    const response = await register(photo).expect(400);
    expect(response.body.message).toContain('La fotografía del rostro');
  });

  it('rechaza evidencia data:text/html', async () => {
    const cookie = await passengerCookie();
    const evidence = 'data:text/html;base64,PGgxPkhvbGE8L2gxPg==';
    const response = await createClaim(cookie, evidence).expect(400);
    expect(response.body.message).toContain('La evidencia');
  });

  it('rechaza el sexto reclamo abierto del mismo usuario', async () => {
    const cookie = await passengerCookie();
    for (let index = 0; index < 5; index += 1) {
      await createClaim(cookie).expect(201);
    }
    const response = await createClaim(cookie).expect(400);
    expect(response.body.message).toBe('Ya tienes 5 reclamos abiertos. Espera su resolución.');
  });

  it("recorta el identificador del login de control y de la auditoría a 120 caracteres", async () => {
    const response = await request(app.getHttpServer()).post("/api/auth/login/control")
      .send({ id: "x".repeat(100_000), password: "mala-clave" });
    expect(response.status).toBe(401);
    const audit = app.get(MemoryService).audit;
    expect(Math.max(...audit.map((entry) => entry.target.length))).toBeLessThanOrEqual(120);
  });

  it("rechaza recargas cuando ENABLE_DEMO_RECHARGE está apagada", async () => {
    const cookie = await passengerCookie();
    const body = { amount: 10, method: "qr", idempotencyKey: "rec-hardening-0001" };
    process.env.ENABLE_DEMO_RECHARGE = "false";
    try {
      await request(app.getHttpServer()).post("/api/wallet/recharge")
        .set("Cookie", cookie).send(body).expect(503);
    } finally {
      process.env.ENABLE_DEMO_RECHARGE = "true";
    }
    await request(app.getHttpServer()).post("/api/wallet/recharge")
      .set("Cookie", cookie).send(body).expect(201);
  });

  it("limita cada recarga a Bs 200", async () => {
    const cookie = await passengerCookie();
    const send = (amount: number, idempotencyKey: string) => request(app.getHttpServer())
      .post("/api/wallet/recharge").set("Cookie", cookie).send({ amount, method: "qr", idempotencyKey });
    await send(200.01, "rec-max-0001").expect(400);
    await send(200, "rec-max-0002").expect(201);
  });

  it("limita las recargas a Bs 1000 en 24 horas", async () => {
    const cookie = await passengerCookie("RUDE80480123"); // cuenta sin recargas previas en este archivo
    const send = (i: number) => request(app.getHttpServer()).post("/api/wallet/recharge").set("Cookie", cookie)
      .send({ amount: 200, method: "qr", idempotencyKey: `rec-tope-000${i}` });
    for (let i = 0; i < 5; i += 1) await send(i).expect(201);
    const response = await send(9).expect(400);
    expect(response.body.message).toContain("Bs 1000");
  });

  it("limita el ajuste manual de saldo a Bs 500 por operación y Bs 2000 por día", async () => {
    const login = await request(app.getHttpServer()).post("/api/auth/login/control")
      .send({ id: "control@rutabol.bo", password: "control123" }).expect(201);
    const cookie = cookiePair(login);
    const adjust = (amount: number) => request(app.getHttpServer()).post("/api/control/wallet/adjust")
      .set("Cookie", cookie).send({ userId: "7654321", amount, reason: "Prueba de límite" });
    await adjust(501).expect(400);
    for (let i = 0; i < 4; i += 1) await adjust(500).expect(201);
    await adjust(1).expect(400);
  });
});
