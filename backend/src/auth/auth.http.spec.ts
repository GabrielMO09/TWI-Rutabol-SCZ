import { RequestMethod } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { PersistenceService } from '../persistence/persistence.service';
import { sessionCookieAuthorization } from '../shared/session-cookie';

const PUBLIC_MUTATIONS = new Set([
  'POST /api/auth/register',
  'POST /api/auth/login/passenger',
  'POST /api/auth/login/driver',
  'POST /api/auth/login/control',
  'POST /api/auth/recovery/request',
  'POST /api/auth/recovery/confirm',
]);

const MUTATION_METHODS = new Map([
  [RequestMethod.POST, 'post'],
  [RequestMethod.PATCH, 'patch'],
  [RequestMethod.PUT, 'put'],
  [RequestMethod.DELETE, 'delete'],
] as const);

function sessionCookie(response: Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((cookie) => cookie.startsWith('rutabol_sid=')) ?? '';
}

describe('Autenticación HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(PersistenceService).useValue({ sync: async () => {} })
      .compile();
    app = module.createNestApplication();
    app.use(sessionCookieAuthorization);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  function login() {
    return request(app.getHttpServer()).post('/api/auth/login/passenger')
      .send({ id: '7654321', password: '123456' }).expect(201);
  }

  it('emite una cookie HttpOnly de ocho horas', async () => {
    const response = await login();
    expect(sessionCookie(response)).toMatch(
      /^rutabol_sid=[\w-]{43}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=28800$/,
    );
  });

  it('acepta solo la cookie en /me y le da prioridad sobre Bearer', async () => {
    const cookie = sessionCookie(await login()).split(';')[0];
    const client = request(app.getHttpServer());

    const response = await client.get('/api/auth/me')
      .set('Cookie', `otra=valor; ${cookie}`).expect(200);
    expect(response.body).toMatchObject({ userId: '7654321' });

    await client.get('/api/auth/me').set('Cookie', cookie)
      .set('Authorization', 'Bearer invalido').expect(200);
  });

  it('devuelve 401 en /me sin cookie ni Bearer', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rota la cookie en refresh y la expira en logout', async () => {
    const initialCookie = sessionCookie(await login()).split(';')[0];
    const client = request(app.getHttpServer());
    const refreshed = await client.post('/api/auth/refresh')
      .set('Cookie', initialCookie).expect(201);
    const nextCookie = sessionCookie(refreshed).split(';')[0];
    expect(nextCookie).toMatch(/^rutabol_sid=[\w-]{43}$/);
    expect(refreshed.body).not.toHaveProperty('token');
    expect(nextCookie).not.toBe(initialCookie);
    expect(sessionCookie(refreshed)).toContain('Max-Age=28800');

    await client.get('/api/auth/me').set('Cookie', initialCookie).expect(401);
    const logout = await client.post('/api/auth/logout')
      .set('Cookie', nextCookie).expect(201);
    expect(logout.body).toEqual({ ok: true });
    expect(sessionCookie(logout)).toBe(
      'rutabol_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    );
    await client.get('/api/auth/me').set('Cookie', nextCookie).expect(401);
  });

  it('exige autenticación en todas las rutas mutadoras fuera de la lista pública', async () => {
    const scanner = new MetadataScanner();
    const client = request(app.getHttpServer());
    const publicRoutes = new Set<string>();
    const unexpectedStatuses: string[] = [];

    for (const module of app.get(ModulesContainer).values()) {
      for (const { metatype } of module.controllers.values()) {
        if (!metatype) continue;
        const basePaths = Reflect.getMetadata(PATH_METADATA, metatype) as string | string[];
        const prototype = metatype.prototype as Record<string, object>;

        for (const name of scanner.getAllMethodNames(prototype)) {
          const handler = prototype[name];
          const method = MUTATION_METHODS.get(Reflect.getMetadata(METHOD_METADATA, handler));
          if (!method) continue;
          const paths = Reflect.getMetadata(PATH_METADATA, handler) as string | string[];

          for (const base of [basePaths].flat()) {
            for (const path of [paths].flat()) {
              const route = '/' + [base, path].join('/').split('/').filter(Boolean).join('/');
              const key = `${method.toUpperCase()} ${route}`;
              if (PUBLIC_MUTATIONS.has(key)) {
                publicRoutes.add(key);
                continue;
              }

              // El 401 comprueba tanto RolesGuard como las comprobaciones dentro del servicio.
              const response = await client[method](route.replace(/:[^/]+/g, 'prueba')).send({});
              if (response.status !== 401) unexpectedStatuses.push(`${key} → ${response.status}`);
            }
          }
        }
      }
    }

    expect(publicRoutes).toEqual(PUBLIC_MUTATIONS);
    expect(unexpectedStatuses).toEqual([]);
  });
});
