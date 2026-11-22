import { fixture } from '../test-support';

describe('Jornada, ocupación, incidentes y pases', () => {
  let context: ReturnType<typeof fixture>;
  let driver: string;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
    driver = `Bearer ${(await context.auth.loginDriver({
      line: '17', internal: '045', pin: '1234',
    })).token}`;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('retira al finalizar jornada y conserva la unidad stale en world a los 30 segundos', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    context.ops.location('17-045', { lat: -17.7834, lng: -63.1821 }, driver);
    context.ops.setJornada(false, driver);
    expect(context.publicService.nearby({ lat: -17.7834, lng: -63.1821 })
      .items.some((item) => item.bus.id === '17-045')).toBe(false);
    jest.spyOn(Date, 'now').mockReturnValue(now + 30000);
    expect(context.publicService.world().buses.find((bus) => bus.id === '17-045'))
      .toMatchObject({ stale: true, onDuty: false });
    expect(() => context.ops.location('17-045', { lat: 0, lng: 0 }, driver)).toThrow();
    expect(() => context.ops.setJornada(true, driver)).toThrow('GPS');
    expect(() => context.ops.setJornada(true, driver, { lat: 500, lng: 0 })).toThrow();
    context.ops.setJornada(true, driver, { lat: -17.78, lng: -63.18 });
    context.ops.location('17-045', { lat: -17.78, lng: -63.18 }, driver);
    const before = context.memory.buses[0].pos;
    context.memory.tick();
    expect(context.memory.buses[0].pos).toEqual(before);
    expect(context.memory.buses[0].source).toBe('gps');
    expect(context.ops.jornada(driver)).toMatchObject({ onDuty: true, busId: '17-045' });
  });

  it('no publica la posición GPS real de una unidad fuera de jornada', () => {
    context.ops.location('17-045', { lat: -17.7001, lng: -63.1001 }, driver);
    context.ops.setJornada(false, driver);
    const bus = context.publicService.world().buses.find((item) => item.id === '17-045')!;
    expect(bus.pos).not.toEqual([-17.7001, -63.1001]);
    expect(context.micros.findMicroById('17-045').pos).toEqual(bus.pos);
  });

  it('corrige ocupación, valida límites, audita y retira la alerta al bajar', () => {
    expect(() => context.ops.correct('17-045', { occupancy: -1, reason: 'Conteo manual' }, driver))
      .toThrow();
    expect(() => context.ops.correct('17-045', { occupancy: 61, reason: 'Conteo manual' }, driver))
      .toThrow();
    expect(() => context.ops.correct('17-045', { occupancy: 25, reason: 'corto'.slice(0, 4) }, driver))
      .toThrow();
    // RN-07: nunca por encima del aforo autorizado (25).
    expect(() => context.ops.correct('17-045', { occupancy: 26, reason: 'Conteo manual' }, driver))
      .toThrow('aforo');
    context.ops.correct('17-045', { occupancy: 25, reason: 'Segundo conteo' }, driver);
    expect(context.memory.alerts.filter((item) => item.kind === 'aforo')).toHaveLength(1);
    expect(context.memory.occupancyEvents.map((item) => item.kind))
      .toEqual(['correccion']);
    context.micros.disembark('17-045', driver);
    expect(context.memory.alerts.filter((item) => item.kind === 'aforo')).toHaveLength(0);
    context.ops.correct('17-045', { occupancy: 0, reason: 'Unidad vacía' }, driver);
    const count = context.memory.occupancyEvents.length;
    context.micros.disembark('17-045', driver);
    expect(context.memory.buses[0].occupancy).toBe(0);
    expect(context.memory.occupancyEvents).toHaveLength(count);
    expect(context.memory.audit.some((item) =>
      item.action === 'ocupacion.corregir' && item.result === 'ok')).toBe(true);
  });

  it('cobra efectivo con tarifa del servidor, sin wallet ni solicitud adicional', () => {
    const actor = context.accreditation.profile('control@rutabol.bo');
    context.fares.update(actor, { escolar: 1.5, reason: 'Nueva tarifa escolar' });
    const before = context.memory.reqs.length;
    // Sin credencial acreditada no hay tarifa preferencial; con la del estudiante aprobado, sí.
    expect(() => context.ops.cash('17-045', { category: 'escolar' }, driver)).toThrow('credencial');
    expect(() => context.ops.cash('17-045', { category: 'universitario', token: 'x.y' }, driver)).toThrow();
    const token = context.credentials.issue('rude80480123').token;
    const ticket = context.ops.cash('17-045', { category: 'escolar', token, fare: 0 }, driver);
    expect(() => context.ops.cash('17-045', { category: 'escolar', token }, driver)).toThrow(); // QR de un solo uso
    expect(ticket).toMatchObject({
      method: 'Efectivo', status: 'abordado', category: 'escolar', fare: 1.5,
    });
    expect(context.memory.buses[0].occupancy).toBe(13);
    expect(context.memory.reqs).toHaveLength(before);
    expect(context.wallet.get('7654321').balance).toBe(30);
    expect(context.memory.occupancyEvents).toHaveLength(1);
    context.ops.correct('17-045', { occupancy: 25, reason: 'Conteo completo' }, driver);
    expect(() => context.ops.cash('17-045', { category: 'general' }, driver)).toThrow();
    expect(context.memory.tickets).toHaveLength(1);
    expect(context.memory.audit.some((item) => item.action === 'efectivo.registrar')).toBe(true);
  });

  it('crea emergencia por incidente grave, oculta conductor y registra atención', async () => {
    const passenger = `Bearer ${(await context.auth.loginPassenger({
      id: '7654321', password: '123456',
    })).token}`;
    context.micros.createTicket({ busId: '17-045', idempotencyKey: 'incidente' }, passenger);
    const incident = context.ops.reportIncident({
      type: 'falla-mecanica', description: 'Falla en el motor de la unidad',
    }, driver);
    expect(incident).toMatchObject({ severity: 'alta', status: 'reportado' });
    expect(context.memory.buses[0].status).toBe('emergencia');
    expect(context.memory.alerts).toEqual([
      expect.objectContaining({ kind: 'incidente', busId: '17-045' }),
    ]);
    expect(JSON.stringify(context.publicService.incidents())).not.toContain('chofer:17-045');
    expect(context.memory.notifications.get('7654321')!.some((item) =>
      item.kind === 'incidente')).toBe(true);
    expect(() => context.micros.resolveEmergency('17-045', driver)).toThrow();
    const actor = context.accreditation.profile('control@rutabol.bo');
    context.ops.updateIncident(actor, incident.id, { status: 'en-atencion' });
    const resolved = context.ops.updateIncident(actor, incident.id, { status: 'resuelto' });
    expect(resolved.history.map((item) => item.status))
      .toEqual(['reportado', 'en-atencion', 'resuelto']);
    expect(context.publicService.incidents()).toHaveLength(0);
    expect(context.memory.buses[0].status).toBe('activo');
  });

  it('canjea únicamente en destino, una vez, sin nueva subida ni cobro', async () => {
    context.micros.emergency('17-045', driver);
    // RF-17: otra línea se rechaza; el rescate es una unidad de la misma línea.
    expect(() => context.micros.emergencyTransfer('17-045', { rescueId: '44-057' }, driver))
      .toThrow('misma línea');
    context.control.createDriver(context.accreditation.profile('control@rutabol.bo'), {
      name: 'Chofer Rescate', line: '17', internal: '078', pin: '4321',
    });
    const transfer = context.micros.emergencyTransfer('17-045', { rescueId: '17-078' }, driver);
    const rescue = `Bearer ${(await context.auth.loginDriver({
      line: '17', internal: '078', pin: '4321',
    })).token}`;
    const pass = transfer.passes[0];
    expect(() => context.ops.redeem({ code: pass.code }, driver)).toThrow();
    const occupancy = context.memory.buses.find((bus) => bus.id === '17-078')!.occupancy;
    const events = context.memory.occupancyEvents.length;
    expect(context.ops.redeem({ code: pass.code }, rescue)).toEqual({ ok: true });
    expect(() => context.ops.redeem({ code: pass.code }, rescue)).toThrow();
    expect(context.memory.buses.find((bus) => bus.id === '17-078')!.occupancy).toBe(occupancy);
    expect(context.memory.occupancyEvents).toHaveLength(events);
    const expired = context.memory.passes.find((item) => item.code === transfer.passes[1].code)!;
    expired.expires = Date.now();
    expect(() => context.ops.redeem({ code: expired.code }, rescue)).toThrow();
  });

  it('devuelve el estado privado únicamente del bus del conductor y los últimos 20 eventos', () => {
    for (let index = 0; index < 25; index += 1) {
      context.ops.correct('17-045', {
        occupancy: index % 20, reason: 'Verificación manual',
      }, driver);
    }
    const state = context.ops.state(driver);
    expect(state.occupancyEvents).toHaveLength(20);
    expect(state.occupancyEvents.every((item) => item.busId === '17-045')).toBe(true);
    expect(state.reqs.every((item) => item.busId === '17-045')).toBe(true);
    expect(Object.keys(state).sort()).toEqual([
      'incidents', 'jornada', 'ledger', 'occupancyEvents', 'passes', 'reqs',
    ]);
  });
});
