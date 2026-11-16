import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { fixture } from '../test-support';

describe('MicrosService', () => {
  let context: ReturnType<typeof fixture>;
  let passenger: string;
  let driver: string;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
    passenger = `Bearer ${(await context.auth.loginPassenger({
      id: 'estudiante@upds.edu.bo', password: '123456',
    })).token}`;
    driver = `Bearer ${(await context.auth.loginDriver({
      line: '17', internal: '045', pin: '1234',
    })).token}`;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('lista las unidades y rechaza identificadores inexistentes', () => {
    expect(context.micros.listMicros()).toHaveLength(5);
    expect(context.micros.findMicroById('17-045')).toMatchObject({
      max: 25, occupancy: 12, progress: 0.3, onDuty: true, source: 'simulado',
    });
    expect(() => context.micros.findMicroById('inexistente')).toThrow(NotFoundException);
  });

  it('crea un ticket idempotente con débito único y un solo evento de abordaje', () => {
    const body = { busId: '17-045', idempotencyKey: 'ticket-1', fare: 0 };
    const first = context.micros.createTicket(body, passenger);
    expect(context.micros.createTicket(body, passenger)).toEqual(first);
    expect(first).toMatchObject({
      fare: 1, category: 'universitario', method: 'Credicard',
      fareReason: 'Tarifa universitaria vigente',
    });
    expect(first.receiptNo).toMatch(/^R-\d{6}$/);
    expect(context.wallet.get('estudiante@upds.edu.bo').balance).toBe(19);
    expect(context.wallet.get('estudiante@upds.edu.bo').movements).toHaveLength(1);
    const requests = context.memory.reqs.filter((item) => item.ticketId === first.id);
    expect(requests).toHaveLength(1);
    expect(requests[0].code).not.toBe('estudiante@upds.edu.bo');
    context.micros.decide(requests[0].id, { accept: true }, driver);
    expect(context.micros.findMicroById('17-045').occupancy).toBe(13);
    expect(context.micros.myTickets(passenger)[0].status).toBe('abordado');
    expect(() => context.micros.decide(requests[0].id, { accept: true }, driver)).toThrow();
    expect(context.memory.occupancyEvents).toHaveLength(1);
  });

  it('reserva cupos y no debita cuando falta saldo o la unidad está llena', () => {
    const bus = context.memory.buses[0];
    bus.occupancy = 22;
    expect(() => context.micros.createTicket({
      busId: bus.id, idempotencyKey: 'lleno',
    }, passenger)).toThrow('La unidad está llena. Elige otro micro.');
    bus.occupancy = 12;
    context.memory.wallets.get('estudiante@upds.edu.bo')!.balance = 0;
    expect(() => context.micros.createTicket({
      busId: bus.id, idempotencyKey: 'sin-saldo',
    }, passenger)).toThrow('Saldo insuficiente. Recarga tu Credicard.');
    expect(context.memory.tickets).toHaveLength(0);
  });

  it('cobra tarifa general a una acreditación pendiente', async () => {
    const lucia = `Bearer ${(await context.auth.loginPassenger({
      id: 'lucia.vaca@upds.edu.bo', password: '123456',
    })).token}`;
    expect(context.micros.createTicket({
      busId: '17-045', idempotencyKey: 'lucia',
    }, lucia)).toMatchObject({
      fare: 3.5, category: 'general', fareReason: 'Acreditación pendiente: tarifa general',
    });
  });

  it('protege unidad y aforo, y mantiene el rechazo de solicitudes', () => {
    expect(() => context.micros.disembark('44-057', driver)).toThrow(ForbiddenException);
    expect(() => context.micros.disembark('17-045', passenger)).toThrow(ForbiddenException);
    expect(() => context.micros.setMax('17-045', { max: 17 }, driver)).toThrow(
      'El aforo debe estar entre 18 y 25 pasajeros.',
    );
    const ticket = context.micros.createTicket({
      busId: '17-045', idempotencyKey: 'rechazar',
    }, passenger);
    const req = context.memory.reqs.find((item) => item.ticketId === ticket.id)!;
    context.micros.decide(req.id, { accept: false }, driver);
    expect(context.micros.myTickets(passenger)[0].status).toBe('rechazado');
    expect(context.memory.buses[0].occupancy).toBe(12);
    expect(context.memory.occupancyEvents).toHaveLength(0);
  });

  it('traslada en emergencia con pases, alerta de aforo y sin segundo débito', () => {
    const ticket = context.micros.createTicket({
      busId: '17-045', idempotencyKey: 'emergencia',
    }, passenger);
    const req = context.memory.reqs.find((item) => item.ticketId === ticket.id)!;
    context.micros.decide(req.id, { accept: true }, driver);
    context.micros.emergency('17-045', driver);
    const result = context.micros.emergencyTransfer('17-045', { rescueId: '17-078' }, driver);
    expect(result.passengers).toBe(3);
    expect(result.passes).toHaveLength(3);
    expect(context.micros.myTickets(passenger)[0]).toMatchObject({
      status: 'pase-temporal', transferredTo: '17-078', passCode: result.passes[0].code,
    });
    const continued = context.micros.createTicket({
      busId: '17-078', idempotencyKey: 'continuacion',
    }, passenger);
    expect(continued.id).toBe(ticket.id);
    expect(context.wallet.get('estudiante@upds.edu.bo').balance).toBe(19);
    expect(context.memory.notifications.get('estudiante@upds.edu.bo')!.some(
      (notification) => notification.kind === 'traspaso',
    )).toBe(true);
    context.micros.resolveEmergency('17-045', driver);
    expect(context.micros.world().alerts).toEqual([
      expect.objectContaining({ kind: 'aforo', busId: '17-078' }),
    ]);
  });

  it('mantiene el traslado por descanso y no filtra su liquidación al mundo público', () => {
    const result = context.micros.restTransfer('17-045', {
      toId: '11-099', creditedTo: 'saliente',
    }, driver);
    expect(result).toMatchObject({ passengers: 12, amount: 42, creditedTo: 'saliente' });
    expect(context.memory.ledger).toEqual([result]);
    expect(context.micros.world()).not.toHaveProperty('ledger');
    expect(context.memory.buses[0].status).toBe('descanso');
    context.micros.resume('17-045', driver);
    expect(context.memory.buses[0].status).toBe('activo');
  });

  it('emite eventos tras comandos y ticks, y limpia el intervalo', () => {
    const received: unknown[] = [];
    const subscription = context.events.stream.subscribe((event) => received.push(event.data));
    context.micros.disembark('17-045', driver);
    context.memory.tick();
    expect(received).toEqual([{ type: 'tick' }, { type: 'tick' }]);
    subscription.unsubscribe();
    jest.useFakeTimers();
    try {
      context.memory.onModuleInit();
      context.memory.onModuleInit();
      expect(jest.getTimerCount()).toBe(1);
      context.memory.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
