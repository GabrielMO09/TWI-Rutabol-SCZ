import { fixture } from '../test-support';

describe('Reclamos y devoluciones', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => context.close());

  it('reembolsa por WalletService una sola vez al repetir la resolución', () => {
    const passenger = context.accreditation.profile('7654321');
    const control = context.accreditation.profile('control@rutabol.bo');
    const claim = context.claims.create(passenger, {
      line: '17', internal: '045', tripAt: Date.now() - 1000,
      description: 'No se respetó la parada solicitada.',
    });
    const body = { status: 'resuelto', response: 'Se verificó el reclamo.', refund: 3.5 };
    const first = context.claims.update(control, claim.id, body);
    expect(context.claims.update(control, claim.id, body)).toEqual(first);
    expect(context.wallet.get(passenger.userId).balance).toBe(33.5);
    expect(context.wallet.get(passenger.userId).movements).toEqual([
      expect.objectContaining({ type: 'devolucion', amount: 3.5, status: 'confirmado' }),
    ]);
    expect(context.memory.notifications.get(passenger.userId)).toHaveLength(1);
    expect(context.memory.audit.filter((item) => item.action === 'reclamo.actualizar'))
      .toHaveLength(1);
    expect(context.claims.list('estudiante@upds.edu.bo')).toEqual([]);
    context.claims.update(control, claim.id, { ...body, refund: 5 });
    expect(context.wallet.get(passenger.userId).balance).toBe(35);
    expect(() => context.claims.update(control, claim.id, { ...body, refund: 2 })).toThrow();
    expect(context.claims.list(passenger.userId)[0].history).toHaveLength(3);
  });

  it('valida descripción, fecha y propiedad del ticket antes de crear el reclamo', async () => {
    const passenger = context.accreditation.profile('7654321');
    const body = {
      line: '17', internal: '045', tripAt: Date.now() - 1000,
      description: 'Descripción válida del reclamo.',
    };
    expect(() => context.claims.create(passenger, { ...body, description: 'corto' })).toThrow();
    expect(() => context.claims.create(passenger, { ...body, tripAt: Date.now() + 60000 })).toThrow();
    const token = `Bearer ${(await context.auth.loginPassenger({
      id: 'estudiante@upds.edu.bo', password: '123456',
    })).token}`;
    const ticket = context.micros.createTicket({ busId: '17-045', idempotencyKey: 'ajeno' }, token);
    expect(() => context.claims.create(passenger, { ...body, ticketId: ticket.id })).toThrow();
    expect(context.memory.claims).toHaveLength(0);
  });
});
