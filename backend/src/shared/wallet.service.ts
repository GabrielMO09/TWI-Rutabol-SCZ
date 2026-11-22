import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Movement, Profile, Recharge, Wallet } from '../micros/models';
import { idempotencyKey, money, objectBody, requiredText, roundMoney, text } from '../micros/input';
import { AuditService } from './audit.service';
import { demoRecharge } from './security';
import { NotificationsService } from './notifications.service';

/** Topes de ajuste manual de saldo (hallazgo #11): por operación y por día y persona de control. */
const ADJUST_MAX = 500;
const ADJUST_DAILY_MAX = 2000;

@Injectable()
export class WalletService implements OnModuleDestroy {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly memory: MemoryService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private wallet(userId: string): Wallet {
    const wallet = this.memory.wallets.get(userId);
    if (!wallet) throw new NotFoundException('Credicard no encontrada.');
    return wallet;
  }

  get(userId: string): Wallet {
    return structuredClone(this.wallet(userId));
  }

  recharges(userId: string): Recharge[] {
    this.wallet(userId);
    return structuredClone([...(this.memory.recharges.get(userId) ?? [])].reverse());
  }

  move(
    userId: string,
    amount: number,
    type: Movement['type'],
    ref: string,
  ): Movement {
    const wallet = this.wallet(userId);
    const existing = wallet.movements.find((item) => item.ref === ref && item.type === type);
    if (existing) return structuredClone(existing);
    money(amount, -1_000_000, 1_000_000);
    const balance = roundMoney(wallet.balance + amount);
    if (balance < 0) {
      this.notifications.push(
        userId, 'saldo', 'Saldo insuficiente', 'Recarga tu Credicard para continuar.',
      );
      throw new HttpException('Saldo insuficiente. Recarga tu Credicard.', 402);
    }
    wallet.balance = balance;
    const movement: Movement = {
      id: this.memory.nextId('MOV'),
      at: Date.now(),
      type,
      amount,
      status: 'confirmado',
      ref,
      balanceAfter: balance,
    };
    wallet.movements.push(movement);
    this.memory.events.emit();
    return structuredClone(movement);
  }

  debitFare(userId: string, amount: number, ref: string): Movement {
    if (this.wallet(userId).status === 'bloqueada') {
      throw new ForbiddenException('Tu Credicard está bloqueada.');
    }
    return this.move(userId, -amount, 'pasaje', ref);
  }

  recharge(userId: string, input: unknown): Recharge {
    // Sin pasarela de pago real, settle() acreditaría saldo gratis: la ruta queda cerrada salvo ENABLE_DEMO_RECHARGE=true.
    if (!demoRecharge()) {
      throw new ServiceUnavailableException('Las recargas aún no están habilitadas.');
    }
    const wallet = this.wallet(userId);
    const body = objectBody(input);
    const key = idempotencyKey(body.idempotencyKey);
    const items = this.memory.recharges.get(userId) ?? [];
    const existing = items.find((item) => item.idempotencyKey === key);
    if (existing) return { ...existing };
    const amount = money(body.amount, 1, 500);
    const today = Date.now() - 86_400_000;
    const recent = items.filter((item) => item.at > today && item.status !== 'fallida')
      .reduce((sum, item) => sum + item.amount, 0);
    if (recent + amount > 1000) {
      throw new BadRequestException('Superaste el límite de recargas de Bs 1000 en 24 horas.');
    }
    const method = body.method;
    if (method !== 'qr' && method !== 'transferencia' && method !== 'tarjeta') {
      throw new BadRequestException('El método de recarga no es válido.');
    }
    const recharge: Recharge = {
      id: this.memory.nextId('REC'),
      at: Date.now(),
      amount,
      method,
      status: 'pendiente',
      idempotencyKey: key,
    };
    items.push(recharge);
    this.memory.recharges.set(userId, items);
    wallet.movements.push({
      id: this.memory.nextId('MOV'),
      at: recharge.at,
      type: 'recarga',
      amount,
      status: 'pendiente',
      ref: recharge.id,
      balanceAfter: wallet.balance,
    });

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.settle(userId, recharge.id);
    }, 2000);
    timer.unref();
    this.timers.add(timer);
    this.memory.events.emit();
    return { ...recharge };
  }

  private settle(userId: string, rechargeId: string): void {
    const recharge = this.memory.recharges.get(userId)?.find((item) => item.id === rechargeId);
    if (!recharge || recharge.status !== 'pendiente') return;
    const wallet = this.wallet(userId);
    const movement = wallet.movements.find((item) => item.ref === recharge.id)!;
    const failed = Math.round(recharge.amount * 100) % 100 === 99;
    recharge.status = failed ? 'fallida' : 'confirmada';
    recharge.note = failed ? 'El proveedor rechazó la recarga de demostración.' : undefined;
    movement.status = failed ? 'rechazado' : 'confirmado';
    if (!failed) wallet.balance = roundMoney(wallet.balance + recharge.amount);
    movement.balanceAfter = wallet.balance;
    this.notifications.push(
      userId,
      'recarga',
      failed ? 'Recarga fallida' : 'Recarga confirmada',
      failed
        ? 'La recarga no pudo completarse. No se acreditó saldo.'
        : `Se acreditaron Bs ${recharge.amount.toFixed(2)} a tu Credicard.`,
    );
    this.memory.events.emit();
  }

  setBlocked(userId: string, blocked: boolean): Wallet {
    this.wallet(userId).status = blocked ? 'bloqueada' : 'activa';
    this.memory.events.emit();
    return this.get(userId);
  }

  linkPhysical(userId: string, input: unknown): Wallet {
    const body = objectBody(input);
    const card = text(body.cardNumber);
    if (!/^\d{16}$/.test(card)) {
      throw new BadRequestException('La tarjeta física debe tener 16 dígitos.');
    }
    this.wallet(userId).physicalLinked = card.slice(-4);
    this.memory.events.emit();
    return this.get(userId);
  }

  adjust(actor: Profile, input: unknown): Wallet {
    let userId = '';
    try {
      const body = objectBody(input);
      userId = requiredText(body.userId, 'El usuario', 1, 200);
      const reason = requiredText(body.reason, 'El motivo', 5);
      const amount = money(body.amount, -ADJUST_MAX, ADJUST_MAX);
      if (amount === 0) throw new BadRequestException('El ajuste debe ser distinto de cero.');
      // Tope diario por persona de control: un ajuste de más requiere repartirse en días o pedir otra aprobación.
      const since = Date.now() - 86_400_000;
      const today = this.memory.audit
        .filter((e) => e.actorId === actor.userId && e.action === 'wallet.ajustar' && e.result === 'ok' && e.at > since)
        .reduce((sum, e) => sum + Math.abs(Number(e.detail.split(':')[0]) || 0), 0);
      if (today + Math.abs(amount) > ADJUST_DAILY_MAX) {
        throw new BadRequestException(`Superaste el límite diario de ajustes (Bs ${ADJUST_DAILY_MAX}).`);
      }
      this.move(userId, amount, 'ajuste', this.memory.nextId('AJ'));
      this.audit.log(actor, 'wallet.ajustar', userId, 'ok', `${amount}: ${reason}`);
      this.notifications.push(
        userId, 'ajuste', 'Ajuste de saldo',
        `Se realizó un ajuste de Bs ${amount.toFixed(2)}. ${reason}`,
      );
      return this.get(userId);
    } catch (error) {
      this.audit.log(
        actor, 'wallet.ajustar', userId, 'error',
        error instanceof Error ? error.message : 'Solicitud inválida.',
      );
      throw error;
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
