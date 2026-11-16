import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RutabolModule } from '../rutabol.module';
import { AuthService } from '../auth/auth.service';
import { MemoryService } from '../micros/memory.service';
import { OpsService } from '../ops/ops.service';

describe('Rutas de la tanda B', () => {
  let app: INestApplication;
  let driver: string;
  let passenger: string;
  let control: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [RutabolModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    const auth = app.get(AuthService);
    driver = `Bearer ${(await auth.loginDriver({
      line: '17', internal: '045', pin: '1234',
    })).token}`;
    passenger = `Bearer ${(await auth.loginPassenger({
      id: '7654321', password: '123456',
    })).token}`;
    control = `Bearer ${(await auth.loginControl({
      id: 'control@rutabol.bo', password: 'control123',
    })).token}`;
    app.get(MemoryService).onModuleDestroy();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('protege el Centro de Control por rol', async () => {
    await request(app.getHttpServer()).get('/api/control/overview').expect(401);
    await request(app.getHttpServer()).get('/api/control/overview')
      .set('Authorization', passenger).expect(403);
    const response = await request(app.getHttpServer()).get('/api/control/overview')
      .set('Authorization', control).expect(200);
    expect(response.body.health).toHaveLength(10);
  });

  it('entrega CSV descargable mediante passthrough', async () => {
    app.get(OpsService).cash('17-045', { category: 'general' }, driver);
    const response = await request(app.getHttpServer())
      .get('/api/control/reports?format=csv&line=17')
      .set('Authorization', control).expect(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition'])
      .toBe('attachment; filename="rutabol-reportes.csv"');
    expect(response.text).toContain('ticketId,at,line,internal,category,fare,method,status');
    expect(response.text).toContain('"Efectivo"');
  });

  it('lista y marca notificaciones propias y publica documentación ligera', async () => {
    const memory = app.get(MemoryService);
    memory.notifications.get('7654321')!.push({
      id: 'N-http', at: Date.now(), kind: 'prueba',
      title: 'Prueba', body: 'Aviso de prueba.', read: false,
    });
    const before = await request(app.getHttpServer()).get('/api/notifications/me')
      .set('Authorization', passenger).expect(200);
    expect(before.body.some((item: { id: string; read: boolean }) =>
      item.id === 'N-http' && !item.read)).toBe(true);
    await request(app.getHttpServer()).post('/api/notifications/read-all')
      .set('Authorization', passenger).expect(201);
    expect(memory.notifications.get('7654321')!.every((item) => item.read)).toBe(true);
    const docs = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(docs.body.routes).toContainEqual({
      method: 'GET', path: '/api/control/reports', role: 'control',
    });
  });
});
