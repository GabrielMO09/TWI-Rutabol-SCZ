import { fixture } from '../test-support';
import { haversine, interpolate } from '../shared/geo';

describe('Consultas públicas', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => context.close());

  it('usa 5 km por defecto y excluye unidades fuera del radio, stale y fuera de servicio', () => {
    const buses = context.memory.buses;
    for (const bus of buses) {
      bus.source = 'gps';
      bus.pos = [-17.7834, -63.1821];
      bus.lastSeen = Date.now();
    }
    buses[1].pos = [-17.8834, -63.1821];
    buses[2].lastSeen = Date.now() - 30001;
    buses[3].onDuty = false;
    buses[4].active = false;
    const result = context.publicService.nearby({ lat: '-17.7834', lng: '-63.1821' });
    expect(result.radiusKm).toBe(5);
    expect(result.items.map((item) => item.bus.id)).toEqual(['17-045']);
    expect(result.items[0]).toMatchObject({
      distanceKm: 0, etaMin: 0, etaReliable: true,
    });
    expect(buses[2].stale).toBe(true);
  });

  it('filtra línea y dirección y calcula ETA mediante haversine', () => {
    const bus = context.memory.buses[0];
    bus.source = 'gps';
    bus.pos = [-17.7934, -63.1821];
    bus.direction = 'ida';
    const result = context.publicService.nearby({
      lat: -17.7834, lng: -63.1821, line: '17', direction: 'ida',
    });
    const item = result.items.find((entry) => entry.bus.id === bus.id)!;
    expect(item.distanceKm).toBeCloseTo(1.11195, 4);
    expect(item.etaMin).toBeCloseTo(item.distanceKm / 18 * 60);
    expect(context.publicService.nearby({
      lat: -17.7834, lng: -63.1821, line: '44', direction: 'ida',
    }).items.every((entry) => entry.bus.line === '44')).toBe(true);
  });

  it('world no expone solicitudes, tickets, pases ni liquidaciones', () => {
    expect(Object.keys(context.publicService.world()).sort()).toEqual([
      'alerts', 'buses', 'incidents',
    ]);
    expect(() => context.publicService.nearby({ lat: '', lng: 0 })).toThrow();
    expect(() => context.publicService.nearby({ lat: 91, lng: 0 })).toThrow();
  });

  it('interpola ida y vuelta sobre la misma polilínea', () => {
    const points = context.memory.lines[0].waypoints;
    expect(interpolate(points, 0)).toEqual(points[0]);
    expect(interpolate(points, 0.5)).toEqual(points[points.length - 1]);
    const forward = interpolate(points, 0.25);
    const reverse = interpolate(points, 0.75);
    expect(haversine(forward, reverse)).toBeCloseTo(0);
  });

  it('el simulador actualiza señal y posición solo de unidades simuladas en jornada', () => {
    const [simulated, gps, offDuty] = context.memory.buses;
    gps.source = 'gps';
    gps.pos = [-17.8, -63.2];
    offDuty.onDuty = false;
    offDuty.lastSeen = Date.now() - 31000;
    const progress = offDuty.progress;
    const before = simulated.lastSeen;
    context.memory.tick();
    expect(simulated.lastSeen).toBeGreaterThanOrEqual(before);
    expect(simulated.progress).toBeCloseTo(0.303);
    expect(gps.pos).toEqual([-17.8, -63.2]);
    expect(offDuty.progress).toBe(progress);
    expect(offDuty.stale).toBe(true);
  });
});
