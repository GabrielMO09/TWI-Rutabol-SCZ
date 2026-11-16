import { fixture } from '../test-support';

describe('Credicard', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
    jest.useFakeTimers();
  });

  afterEach(() => {
    context.close();
    jest.useRealTimers();
  });

  it('acredita una sola vez por usuario y clave aunque se repita la petición', () => {
    const userId = '7654321';
    const body = { amount: 12.5, method: 'qr', idempotencyKey: 'recarga-1' };
    const first = context.wallet.recharge(userId, body);
    expect(context.wallet.recharge(userId, body)).toEqual(first);
    expect(context.wallet.get(userId).balance).toBe(30);
    jest.advanceTimersByTime(2000);
    expect(context.wallet.get(userId).balance).toBe(42.5);
    expect(context.wallet.recharge(userId, body)).toMatchObject({
      id: first.id, status: 'confirmada',
    });
    jest.advanceTimersByTime(10000);
    expect(context.wallet.get(userId).balance).toBe(42.5);
    expect(context.wallet.get(userId).movements).toHaveLength(1);
    expect(context.wallet.recharges(userId)).toHaveLength(1);
    expect(context.memory.notifications.get(userId)).toHaveLength(1);
  });

  it('una recarga terminada en .99 falla sin acreditar', () => {
    context.wallet.recharge('7654321', {
      amount: 5.99, method: 'tarjeta', idempotencyKey: 'fallida',
    });
    jest.advanceTimersByTime(2000);
    expect(context.wallet.get('7654321').balance).toBe(30);
    expect(context.wallet.recharges('7654321')[0].status).toBe('fallida');
    expect(context.wallet.get('7654321').movements[0].status).toBe('rechazado');
  });

  it('no permite débitos con saldo insuficiente ni con tarjeta bloqueada', () => {
    expect(() => context.wallet.debitFare('7654321', 31, 'ticket-1')).toThrow(
      'Saldo insuficiente. Recarga tu Credicard.',
    );
    expect(context.wallet.get('7654321').balance).toBe(30);
    expect(context.wallet.get('7654321').movements).toHaveLength(0);
    context.wallet.setBlocked('7654321', true);
    expect(() => context.wallet.debitFare('7654321', 1, 'ticket-2')).toThrow(
      'Tu Credicard está bloqueada.',
    );
    context.wallet.setBlocked('7654321', false);
    context.wallet.debitFare('7654321', 1, 'ticket-2');
    context.wallet.debitFare('7654321', 1, 'ticket-2');
    expect(context.wallet.get('7654321').balance).toBe(29);
  });

  it('vincula solo los últimos cuatro dígitos y audita ajustes', () => {
    const wallet = context.wallet.linkPhysical('7654321', {
      cardNumber: '1234567890123456',
    });
    expect(wallet.physicalLinked).toBe('3456');
    const actor = context.accreditation.profile('control@rutabol.bo');
    context.wallet.adjust(actor, {
      userId: '7654321', amount: -5, reason: 'Corrección de saldo.',
    });
    expect(context.wallet.get('7654321').balance).toBe(25);
    expect(context.memory.audit[0].action).toBe('wallet.ajustar');
  });
});
