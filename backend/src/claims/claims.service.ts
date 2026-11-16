import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Claim, Profile } from '../micros/models';
import { money, objectBody, requiredText } from '../micros/input';
import { WalletService } from '../shared/wallet.service';
import { AuditService } from '../shared/audit.service';
import { NotificationsService } from '../shared/notifications.service';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly memory: MemoryService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  create(actor: Profile, input: unknown): Claim {
    const body = objectBody(input);
    const line = requiredText(body.line, 'La línea', 1, 30);
    const internal = requiredText(body.internal, 'El interno', 1, 30);
    if (!this.memory.buses.some((bus) => bus.line === line && bus.internal === internal)) {
      throw new BadRequestException('La línea y el interno no corresponden a una unidad.');
    }
    if (typeof body.tripAt !== 'number' || !Number.isFinite(body.tripAt) ||
      body.tripAt < 0 || body.tripAt > Date.now()) {
      throw new BadRequestException('La fecha del viaje debe estar en milisegundos y no ser futura.');
    }
    const description = requiredText(body.description, 'La descripción', 10, 5000);
    const evidence = body.evidence === undefined
      ? undefined : requiredText(body.evidence, 'La evidencia', 1, 4_000_000);
    const ticketId = body.ticketId === undefined
      ? undefined : requiredText(body.ticketId, 'El ticket', 1, 100);
    if (ticketId) {
      const ticket = this.memory.tickets.find((item) => item.id === ticketId);
      if (!ticket || this.memory.ticketOwners.get(ticketId) !== actor.userId ||
        (ticket.busId !== `${line}-${internal}` &&
          ticket.transferredTo !== `${line}-${internal}`)) {
        throw new BadRequestException('El ticket no corresponde al usuario o a la unidad.');
      }
    }
    const now = Date.now();
    const claim: Claim = {
      id: this.memory.nextId('CL'), userId: actor.userId, name: actor.name,
      line, internal, tripAt: body.tripAt, description,
      ...(evidence ? { evidence } : {}), ...(ticketId ? { ticketId } : {}),
      status: 'recibido', at: now, updatedAt: now,
      history: [{ at: now, status: 'recibido', by: actor.userId }],
    };
    this.memory.claims.push(claim);
    this.memory.events.emit();
    return structuredClone(claim);
  }

  list(userId?: string): Claim[] {
    return structuredClone(this.memory.claims
      .filter((item) => userId === undefined || item.userId === userId)
      .slice().reverse());
  }

  update(actor: Profile, id: string, input: unknown): Claim {
    try {
      const item = this.memory.claims.find((claim) => claim.id === id);
      if (!item) throw new NotFoundException('Reclamo no encontrado.');
      const body = objectBody(input);
      const status = body.status;
      if (status !== 'recibido' && status !== 'en-revision' &&
        status !== 'resuelto' && status !== 'rechazado') {
        throw new BadRequestException('El estado del reclamo no es válido.');
      }
      const response = body.response === undefined
        ? item.response : requiredText(body.response, 'La respuesta', 1, 3000);
      const refund = body.refund === undefined
        ? item.refund ?? 0 : money(body.refund, 0, 1_000_000);
      const previous = item.refund ?? 0;
      if (refund < previous) {
        throw new BadRequestException('No se puede reducir un reembolso ya acreditado.');
      }
      if (item.status === status && item.response === response && refund === previous) {
        return structuredClone(item);
      }
      if (refund > previous) {
        this.wallet.move(item.userId, refund - previous, 'devolucion', `reclamo:${id}:${refund}`);
      }
      item.status = status;
      item.response = response;
      item.refund = refund;
      item.updatedAt = Date.now();
      item.history.push({
        at: item.updatedAt, status, by: actor.userId,
        ...(response ? { note: response } : {}),
      });
      this.audit.log(actor, 'reclamo.actualizar', id, 'ok',
        `${status}; devolución acumulada: Bs ${refund.toFixed(2)}. ${response ?? ''}`);
      this.notifications.push(item.userId, 'reclamo', 'Reclamo actualizado',
        `Tu reclamo ${id} está ${status}.${response ? ` ${response}` : ''}` +
        (refund > previous ? ` Se devolvieron Bs ${(refund - previous).toFixed(2)}.` : ''));
      this.memory.events.emit();
      return structuredClone(item);
    } catch (error) {
      this.audit.log(actor, 'reclamo.actualizar', id, 'error',
        error instanceof Error ? error.message : 'Actualización inválida.');
      throw error;
    }
  }
}
