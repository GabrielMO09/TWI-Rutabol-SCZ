import { fixture } from '../test-support';
import { HEALTH_IDS } from './control.service';

describe('Centro de Control', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('siempre devuelve todos los checks, con y sin problemas', () => {
    context.memory.onModuleInit();
    let overview = context.control.overview();
    expect(overview.health.map((item) => item.id)).toEqual([...HEALTH_IDS]);
    expect(overview.health.every((item) => typeof item.ok === 'boolean')).toBe(true);
    expect(overview.health.find((item) => item.id === 'simulador-gps')!.ok).toBe(true);
    const now = Date.now();
    const bus = context.memory.buses[0];
    bus.lastSeen = now - 31000;
    bus.occupancy = bus.max + 1;
    bus.onDuty = false;
    bus.status = 'emergencia';
    context.memory.incidents.push({
      id: 'INC-test', busId: bus.id, line: bus.line, internal: bus.internal,
      type: 'accidente', description: 'Accidente pendiente', severity: 'alta',
      status: 'reportado', at: now - 300001, updatedAt: now - 300001, history: [],
    });
    context.memory.recharges.get('7654321')!.push({
      id: 'REC-test', at: now - 10001, amount: 10, method: 'qr',
      status: 'pendiente', idempotencyKey: 'demo',
    });
    context.claims.create(context.accreditation.profile('7654321'), {
      line: bus.line, internal: bus.internal, tripAt: now - 1000,
      description: 'Reclamo pendiente de respuesta.',
    });
    overview = context.control.overview();
    expect(overview.health.map((item) => item.id)).toEqual([...HEALTH_IDS]);
    for (const id of HEALTH_IDS.slice(0, 8)) {
      expect(overview.health.find((item) => item.id === id)!.ok).toBe(false);
    }
    expect(overview.kpis).toMatchObject({
      busesActivos: 5, busesSinSenal: 1, incidentesAbiertos: 1,
      reclamosAbiertos: 1, recargasPendientes: 1,
    });
    context.memory.onModuleDestroy();
    expect(context.control.overview().health.find((item) => item.id === 'simulador-gps')!.ok)
      .toBe(false);
  });

  it('crea buses sin duplicar interno o placa y los incorpora al simulador tras iniciar jornada', async () => {
    const actor = context.accreditation.profile('control@rutabol.bo');
    const body = { line: '17', internal: '100', plate: '5555-AAA', max: 20 };
    const bus = context.control.createBus(actor, body);
    expect(bus).toMatchObject({ id: '17-100', source: 'simulado', onDuty: false });
    expect(() => context.control.createBus(actor, body)).toThrow('Ya existe una unidad');
    expect(() => context.control.createBus(actor, { ...body, internal: '101' }))
      .toThrow('La placa ya está registrada');
    expect(() => context.control.updateBus(actor, bus.id, { plate: '2345-abc' })).toThrow();
    expect(() => context.control.updateBus(actor, bus.id, { max: 17 })).toThrow();
    context.control.createDriver(actor, {
      name: 'Chofer Nuevo', line: '17', internal: '100', pin: '4321',
    });
    expect(() => context.control.createDriver(actor, {
      name: 'Otro Chofer', line: '17', internal: '100', pin: '4321',
    })).toThrow();
    const driver = `Bearer ${(await context.auth.loginDriver({
      line: '17', internal: '100', pin: '4321',
    })).token}`;
    context.ops.setJornada(true, driver);
    context.memory.tick();
    expect(context.memory.buses.find((item) => item.id === bus.id)!.progress).toBeCloseTo(0.003);
    context.control.updateBus(actor, bus.id, { active: false });
    expect(context.publicService.world().buses.some((item) => item.id === bus.id)).toBe(false);
    expect(context.publicService.nearby({ lat: -17.7834, lng: -63.1821 })
      .items.some((item) => item.bus.id === bus.id)).toBe(false);
    expect(context.memory.audit.some((item) => item.action === 'bus.crear')).toBe(true);
  });

  it('gestiona líneas y conductores sin revelar secretos', async () => {
    const actor = context.accreditation.profile('control@rutabol.bo');
    expect(() => context.control.createLine(actor, {
      id: '99', name: 'Línea 99', waypoints: [[100, 0], [0, 0]],
    })).toThrow();
    const line = context.control.createLine(actor, {
      id: '99', name: 'Línea 99', waypoints: [[-17.78, -63.18], [-17.79, -63.19]],
    });
    context.control.updateLine(actor, line.id, { active: false });
    expect(context.publicService.lines().some((item) => item.id === line.id)).toBe(false);
    context.control.updateDriver(actor, 'chofer:17-045', { name: 'Carlos Actualizado', pin: '5678' });
    const login = await context.auth.loginDriver({ line: '17', internal: '045', pin: '5678' });
    expect(login.profile.name).toBe('Carlos Actualizado');
    expect(JSON.stringify(context.control.drivers())).not.toContain('"pin"');
    expect(JSON.stringify(context.control.users())).not.toContain('"secret"');
    context.control.setUserStatus(actor, '7654321', { status: 'suspendido' });
    await expect(context.auth.loginPassenger({ id: '7654321', password: '123456' }))
      .rejects.toThrow('Tu cuenta está suspendida.');
  });

  it('reporta efectivo y Credicard sin duplicar ingresos por traspaso y filtra fechas y línea', async () => {
    const driver = `Bearer ${(await context.auth.loginDriver({
      line: '17', internal: '045', pin: '1234',
    })).token}`;
    const passenger = `Bearer ${(await context.auth.loginPassenger({
      id: '7654321', password: '123456',
    })).token}`;
    context.ops.cash('17-045', { category: 'escolar' }, driver);
    context.micros.createTicket({ busId: '17-045', idempotencyKey: 'reporte' }, passenger);
    const json = context.reports.report({ format: 'json', from: '0', line: '17' });
    expect(json.format).toBe('json');
    expect(json.data).toMatchObject({
      rows: expect.any(Array),
      totals: {
        viajes: 2, recaudacion: 4.5,
        recaudacionPorCategoria: { general: 3.5, escolar: 1, universitario: 0 },
      },
    });
    const csv = context.reports.report({ format: 'csv', line: '17' });
    expect(csv.format).toBe('csv');
    expect(csv.data).toEqual(expect.stringContaining('ticketId,at,line,internal'));
    expect(csv.data).toEqual(expect.stringContaining('"Efectivo"'));
    expect(context.reports.report({ line: '44' }).data).toMatchObject({ rows: [] });
    expect(() => context.reports.report({ from: '20', to: '10' })).toThrow();
    expect(() => context.reports.report({ format: 'xml' })).toThrow();
  });
});
