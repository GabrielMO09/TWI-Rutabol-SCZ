import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MemoryService } from './memory.service';
import type { Bus, LedgerEntry, Pass, Ticket } from './models';
import { idempotencyKey, maskCode, objectBody, roundMoney, text } from './input';
import { FaresService } from '../shared/fares.service';
import { WalletService } from '../shared/wallet.service';
import { AccreditationService } from '../shared/accreditation.service';
import { NotificationsService } from '../shared/notifications.service';
import { PublicService } from '../public/public.service';
import { AuditService } from '../shared/audit.service';
import { changeOccupancy, syncCapacity } from '../ops/occupancy';

@Injectable()
export class MicrosService {
  constructor(
    private readonly memory: MemoryService,
    private readonly auth: AuthService,
    private readonly fares: FaresService,
    private readonly wallet: WalletService,
    private readonly accreditation: AccreditationService,
    private readonly notifications: NotificationsService,
    private readonly publicService: PublicService,
    private readonly audit: AuditService,
  ) {}

  listMicros(): Bus[] {
    return this.memory.buses.filter((bus) => bus.active).map((bus) => this.publicService.publicBus(bus));
  }

  findMicroById(id: string): Bus {
    return this.publicService.publicBus(this.bus(id));
  }

  private snapshot(bus: Bus): Bus {
    this.memory.refreshBus(bus);
    return structuredClone(bus);
  }

  private bus(id: string): Bus {
    const bus = this.memory.buses.find((item) => item.id === id);
    if (!bus) throw new NotFoundException(`No se encontró el micro con id ${id}.`);
    return bus;
  }

  private driverBus(id: string, authorization?: string): Bus {
    this.auth.requireDriver(authorization, id);
    return this.bus(id);
  }

  private pending(busId: string): number {
    return this.memory.reqs.filter((req) => req.busId === busId).length;
  }

  private available(bus: Bus): void {
    this.memory.refreshBus(bus);
    if (!bus.active || !bus.onDuty || bus.stale || bus.status !== 'activo' ||
      !this.memory.lines.some((line) => line.id === bus.line && line.active)) {
      throw new BadRequestException('La unidad no está disponible.');
    }
  }

  world() {
    return this.publicService.world();
  }

  createTicket(input: unknown, authorization?: string): Ticket {
    const profile = this.auth.requirePassenger(authorization);
    const body = objectBody(input);
    const key = idempotencyKey(body.idempotencyKey);
    const existing = this.memory.tickets.find((ticket) =>
      ticket.idempotencyKey === key &&
      this.memory.ticketOwners.get(ticket.id) === profile.userId,
    );
    if (existing) return { ...existing };
    const bus = this.bus(text(body.busId));
    const transferred = this.memory.tickets.find((ticket) =>
      this.memory.ticketOwners.get(ticket.id) === profile.userId &&
      ticket.status === 'pase-temporal' && ticket.transferredTo === bus.id &&
      this.memory.passes.some((pass) =>
        pass.code === ticket.passCode && pass.expires > Date.now(),
      ),
    );
    if (transferred) return { ...transferred };
    this.available(bus);
    if (bus.occupancy + this.pending(bus.id) >= bus.max) {
      throw new BadRequestException('La unidad está llena. Elige otro micro.');
    }
    const category = profile.fareCategory ?? 'general';
    const fare = this.fares.amount(category);
    const id = this.memory.nextId('T');
    this.wallet.debitFare(profile.userId, fare, id);
    const ticket: Ticket = {
      id, busId: bus.id, line: bus.line, internal: bus.internal,
      fare, category, fareReason: this.accreditation.fareReason(profile.userId),
      method: 'Credicard', at: Date.now(), status: 'pagado',
      receiptNo: this.memory.nextReceipt(), idempotencyKey: key,
    };
    this.memory.tickets.push(ticket);
    this.memory.ticketOwners.set(ticket.id, profile.userId);
    this.memory.reqs.push({
      id: this.memory.nextId('REQ'), busId: bus.id, ticketId: ticket.id,
      userId: profile.userId, name: profile.name, category,
      code: maskCode(profile.code ?? ''), photo: profile.photo, fare: ticket.fare,
    });
    this.memory.events.emit();
    return { ...ticket };
  }

  myTickets(authorization?: string): Ticket[] {
    const profile = this.auth.requirePassenger(authorization);
    return this.memory.tickets
      .filter((ticket) => this.memory.ticketOwners.get(ticket.id) === profile.userId)
      .slice().reverse().map((ticket) => ({ ...ticket }));
  }

  decide(id: string, input: unknown, authorization?: string) {
    const actor = this.auth.requireDriver(authorization);
    const req = this.memory.reqs.find((item) => item.id === id);
    if (!req) throw new NotFoundException('Solicitud de abordaje no encontrada.');
    const bus = this.driverBus(req.busId, authorization);
    const body = objectBody(input);
    if (typeof body.accept !== 'boolean') {
      throw new BadRequestException('La decisión debe ser un booleano.');
    }
    if (body.accept) {
      this.available(bus);
      if (bus.occupancy >= bus.max) {
        throw new BadRequestException('Unidad llena: admisión bloqueada.');
      }
      changeOccupancy(this.memory, bus, bus.occupancy + 1, 'subida', actor.userId, req.id);
    }
    const ticket = this.memory.tickets.find((item) => item.id === req.ticketId);
    if (ticket) ticket.status = body.accept ? 'abordado' : 'rechazado';
    this.memory.reqs.splice(this.memory.reqs.indexOf(req), 1);
    this.memory.events.emit();
    return { ok: true };
  }

  disembark(id: string, authorization?: string): Bus {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    changeOccupancy(this.memory, bus, Math.max(0, bus.occupancy - 1), 'bajada', actor.userId);
    this.memory.events.emit();
    return this.snapshot(bus);
  }

  setMax(id: string, input: unknown, authorization?: string): Bus {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    const { max } = objectBody(input);
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 18 || max > 25) {
      throw new BadRequestException('El aforo debe estar entre 18 y 25 pasajeros.');
    }
    if (max < bus.occupancy) {
      throw new BadRequestException('El aforo no puede ser menor a los pasajeros a bordo.');
    }
    bus.max = max;
    syncCapacity(this.memory, bus);
    this.audit.log(actor, 'aforo.actualizar', id, 'ok', `Aforo: ${max}.`);
    this.memory.events.emit();
    return this.snapshot(bus);
  }

  emergency(id: string, authorization?: string): Bus {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    const already = this.memory.alerts.some(
      (alert) => alert.busId === id && alert.kind === 'emergencia',
    );
    bus.status = 'emergencia';
    if (!already) {
      this.memory.alerts.push({
        id: this.memory.nextId('A'), busId: id, at: Date.now(),
        kind: 'emergencia', message: 'La unidad está en emergencia.',
      });
      const owners = new Set(this.activeTickets(id).map(
        (ticket) => this.memory.ticketOwners.get(ticket.id),
      ));
      for (const owner of owners) {
        if (owner) this.notifications.push(owner, 'emergencia', 'Emergencia en tu micro',
          `La unidad ${id} está en emergencia. Espera las indicaciones del chofer.`);
      }
      this.audit.log(actor, 'emergencia.iniciar', id, 'ok', 'Emergencia reportada.');
    }
    this.memory.events.emit();
    return this.snapshot(bus);
  }

  resolveEmergency(id: string, authorization?: string): Bus {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    if (this.memory.incidents.some((item) =>
      item.busId === id && item.severity === 'alta' && item.status !== 'resuelto')) {
      throw new BadRequestException('El Centro de Control debe resolver los incidentes graves.');
    }
    bus.status = 'activo';
    for (let index = this.memory.alerts.length - 1; index >= 0; index -= 1) {
      const alert = this.memory.alerts[index];
      if (alert.busId === id && alert.kind === 'emergencia') this.memory.alerts.splice(index, 1);
    }
    this.audit.log(actor, 'emergencia.resolver', id, 'ok', 'Emergencia resuelta.');
    this.memory.events.emit();
    return this.snapshot(bus);
  }

  private activeTickets(busId: string): Ticket[] {
    return this.memory.tickets.filter((ticket) =>
      (ticket.transferredTo ?? ticket.busId) === busId &&
      (ticket.status === 'pagado' || ticket.status === 'abordado' ||
        ticket.status === 'pase-temporal'),
    );
  }

  private transferTickets(fromBus: string, toBus: string, passengers: number): Pass[] {
    const passes: Pass[] = Array.from({ length: passengers }, () => ({
      id: this.memory.nextId('P'), code: `TMP-${randomBytes(12).toString('hex')}`, // impredecible: el código actúa como credencial
      fromBus, toBus, expires: Date.now() + 3600000,
    }));
    this.memory.passes.push(...passes);
    const tickets = this.activeTickets(fromBus)
      .sort((a, b) => Number(b.status !== 'pagado') - Number(a.status !== 'pagado'))
      .slice(0, passengers);
    tickets.forEach((ticket, index) => {
      const oldPass = this.memory.passes.find((pass) => pass.code === ticket.passCode);
      if (oldPass) oldPass.expires = Math.min(oldPass.expires, Date.now());
      ticket.status = 'pase-temporal';
      ticket.transferredTo = toBus;
      ticket.passCode = passes[index].code;
      const reqIndex = this.memory.reqs.findIndex((req) => req.ticketId === ticket.id);
      if (reqIndex >= 0) this.memory.reqs.splice(reqIndex, 1);
      const owner = this.memory.ticketOwners.get(ticket.id);
      if (owner) this.notifications.push(owner, 'traspaso', 'Trasbordo sin nuevo cobro',
        `Continúa en la unidad ${toBus} con el pase ${ticket.passCode}. Es válido por una hora.`);
    });
    return structuredClone(passes);
  }

  emergencyTransfer(id: string, input: unknown, authorization?: string) {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    if (bus.status !== 'emergencia') {
      throw new BadRequestException('La unidad no está en emergencia.');
    }
    const rescue = this.bus(text(objectBody(input).rescueId));
    if (rescue.id === bus.id) {
      throw new BadRequestException('Selecciona otra unidad de rescate.');
    }
    this.sameLine(bus, rescue);
    this.available(rescue);
    const capacity = rescue.max - rescue.occupancy - this.pending(rescue.id);
    if (capacity <= 0) throw new BadRequestException('La unidad de rescate no tiene cupo.');
    const passengers = Math.min(bus.occupancy, capacity);
    if (passengers === 0) throw new BadRequestException('No hay pasajeros para trasladar.');
    changeOccupancy(this.memory, bus, bus.occupancy - passengers, 'bajada',
      actor.userId, `Traspaso a ${rescue.id}`);
    changeOccupancy(this.memory, rescue, rescue.occupancy + passengers, 'subida',
      actor.userId, `Traspaso desde ${bus.id}`);
    const passes = this.transferTickets(bus.id, rescue.id, passengers);
    this.audit.log(actor, 'emergencia.traspasar', id, 'ok',
      `origen=${bus.id}; destino=${rescue.id}; pasajeros=${passengers}.`);
    this.alertReceiver(rescue.id, bus.id, passengers);
    this.memory.events.emit();
    return {
      passengers, fromBus: this.snapshot(bus), toBus: this.snapshot(rescue), passes,
    };
  }

  /** RF-17: el traspaso solo es válido hacia una unidad de la misma línea (no hay otra autorización). */
  private sameLine(from: Bus, to: Bus): void {
    if (from.line !== to.line) {
      throw new BadRequestException('La unidad receptora debe pertenecer a la misma línea.');
    }
  }

  /** Avisa al chofer receptor (ve las alertas de su unidad) sin exigir su aprobación previa. */
  private alertReceiver(toBus: string, fromBus: string, passengers: number): void {
    this.memory.alerts.push({
      id: this.memory.nextId('A'), busId: toBus, at: Date.now(), kind: 'emergencia',
      message: `Traspaso recibido: ${passengers} pasajeros desde la unidad ${fromBus}.`,
    });
  }

  restTransfer(id: string, input: unknown, authorization?: string): LedgerEntry {
    const actor = this.auth.requireDriver(authorization, id);
    const bus = this.bus(id);
    this.available(bus);
    const body = objectBody(input);
    const outgoing = this.bus(text(body.toId));
    if (outgoing.id === bus.id) throw new BadRequestException('Selecciona otra unidad saliente.');
    this.sameLine(bus, outgoing);
    this.available(outgoing);
    if (body.creditedTo !== 'descanso' && body.creditedTo !== 'saliente') {
      throw new BadRequestException('Selecciona el destino del cobro.');
    }
    if (outgoing.occupancy + this.pending(outgoing.id) + bus.occupancy > outgoing.max) {
      throw new BadRequestException('La unidad saliente no tiene cupo para todos los pasajeros.');
    }
    const passengers = bus.occupancy;
    changeOccupancy(this.memory, outgoing, outgoing.occupancy + passengers, 'subida',
      actor.userId, `Descanso de ${id}`);
    changeOccupancy(this.memory, bus, 0, 'bajada', actor.userId, `Traspaso a ${outgoing.id}`);
    bus.status = 'descanso';
    this.transferTickets(bus.id, outgoing.id, passengers);
    const entry: LedgerEntry = {
      id: this.memory.nextId('L'), at: Date.now(), fromBus: bus.id, toBus: outgoing.id,
      passengers, amount: roundMoney(passengers * this.fares.amount('general')),
      creditedTo: body.creditedTo,
    };
    this.memory.ledger.push(entry);
    this.audit.log(actor, 'descanso.traspasar', id, 'ok',
      `origen=${bus.id}; destino=${outgoing.id}; pasajeros=${passengers}; cobro a ${body.creditedTo}.`);
    this.alertReceiver(outgoing.id, bus.id, passengers);
    this.memory.events.emit();
    return { ...entry };
  }

  resume(id: string, authorization?: string): Bus {
    const bus = this.driverBus(id, authorization);
    if (bus.status === 'emergencia') {
      throw new BadRequestException('Primero resuelve la emergencia.');
    }
    bus.status = 'activo';
    this.memory.events.emit();
    return this.snapshot(bus);
  }

  deleteAlert(id: string, authorization?: string) {
    this.auth.requireDriver(authorization);
    const alert = this.memory.alerts.find((item) => item.id === id);
    if (!alert) throw new NotFoundException('Alerta no encontrada.');
    this.auth.requireDriver(authorization, alert.busId);
    const bus = this.bus(alert.busId);
    if (alert.kind === 'aforo' && bus.occupancy >= bus.max) {
      throw new BadRequestException('La alerta se retira cuando la ocupación baja del aforo.');
    }
    if (alert.kind === 'incidente' ||
      (alert.kind === 'emergencia' && bus.status === 'emergencia')) {
      throw new BadRequestException('Primero resuelve el incidente o la emergencia.');
    }
    this.memory.alerts.splice(this.memory.alerts.indexOf(alert), 1);
    this.memory.events.emit();
    return { ok: true };
  }
}
