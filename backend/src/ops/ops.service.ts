import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MemoryService } from '../micros/memory.service';
import type { Bus, Incident, Profile, Ticket } from '../micros/models';
import { objectBody, requiredText } from '../micros/input';
import { AuditService } from '../shared/audit.service';
import { FaresService } from '../shared/fares.service';
import { NotificationsService } from '../shared/notifications.service';
import { changeOccupancy } from './occupancy';
import { integer, position } from './validation';

@Injectable()
export class OpsService {
  constructor(
    private readonly memory: MemoryService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly fares: FaresService,
    private readonly notifications: NotificationsService,
  ) {}

  private bus(id: string): Bus {
    const bus = this.memory.buses.find((item) => item.id === id);
    if (!bus) throw new NotFoundException('Unidad no encontrada.');
    return bus;
  }

  private driver(authorization?: string, id?: string) {
    const profile = this.auth.requireDriver(authorization, id);
    return { profile, bus: this.bus(profile.busId!) };
  }

  private operational(bus: Bus): void {
    if (!bus.active || !bus.onDuty || bus.status !== 'activo' ||
      !this.memory.lines.some((line) => line.id === bus.line && line.active)) {
      throw new BadRequestException('La unidad no está disponible.');
    }
  }

  jornada(authorization?: string) {
    const { bus } = this.driver(authorization);
    return {
      onDuty: bus.onDuty, busId: bus.id,
      ...(bus.startedAt !== undefined ? { startedAt: bus.startedAt } : {}),
    };
  }

  setJornada(onDuty: boolean, authorization?: string) {
    const { profile, bus } = this.driver(authorization);
    if (onDuty && (!bus.active ||
      !this.memory.lines.some((line) => line.id === bus.line && line.active))) {
      throw new BadRequestException('La unidad o su línea está inactiva.');
    }
    if (bus.onDuty !== onDuty) {
      bus.onDuty = onDuty;
      if (onDuty) {
        bus.startedAt = Date.now();
        if (bus.source === 'simulado') bus.lastSeen = Date.now();
      }
      this.memory.refreshBus(bus);
      this.audit.log(profile, onDuty ? 'jornada.iniciar' : 'jornada.finalizar',
        bus.id, 'ok', onDuty ? 'Jornada iniciada.' : 'Jornada finalizada.');
      this.memory.events.emit();
    }
    return this.jornada(authorization);
  }

  location(id: string, input: unknown, authorization?: string): Bus {
    const { bus } = this.driver(authorization, id);
    if (!bus.active || !bus.onDuty) {
      throw new BadRequestException('Debes iniciar la jornada en una unidad activa.');
    }
    const body = objectBody(input);
    const pos = position(body.lat, body.lng);
    if (body.accuracy !== undefined &&
      (typeof body.accuracy !== 'number' || !Number.isFinite(body.accuracy) || body.accuracy < 0)) {
      throw new BadRequestException('La precisión debe ser un número no negativo.');
    }
    bus.source = 'gps';
    bus.pos = pos;
    bus.lastSeen = Date.now();
    bus.stale = false;
    this.memory.events.emit();
    return structuredClone(bus);
  }

  state(authorization?: string) {
    const { bus } = this.driver(authorization);
    return structuredClone({
      reqs: this.memory.reqs.filter((item) => item.busId === bus.id),
      ledger: this.memory.ledger.filter(
        (item) => item.fromBus === bus.id || item.toBus === bus.id,
      ),
      passes: this.memory.passes.filter(
        (item) => item.fromBus === bus.id || item.toBus === bus.id,
      ),
      incidents: this.memory.incidents.filter((item) => item.busId === bus.id),
      occupancyEvents: this.memory.occupancyEvents
        .filter((item) => item.busId === bus.id).slice(-20).reverse(),
      jornada: this.jornada(authorization),
    });
  }

  correct(id: string, input: unknown, authorization?: string): Bus {
    const { profile, bus } = this.driver(authorization, id);
    try {
      const body = objectBody(input);
      const occupancy = integer(body.occupancy, 0, 60, 'La ocupación');
      const reason = requiredText(body.reason, 'El motivo', 5, 1000);
      changeOccupancy(this.memory, bus, occupancy, 'correccion', profile.userId, reason);
      this.audit.log(profile, 'ocupacion.corregir', id, 'ok', `${occupancy}: ${reason}`);
      this.memory.events.emit();
      return structuredClone(bus);
    } catch (error) {
      this.audit.log(profile, 'ocupacion.corregir', id, 'error',
        error instanceof Error ? error.message : 'Corrección inválida.');
      throw error;
    }
  }

  cash(id: string, input: unknown, authorization?: string): Ticket {
    const { profile, bus } = this.driver(authorization, id);
    try {
      const category = objectBody(input).category;
      if (category !== 'general' && category !== 'escolar' && category !== 'universitario') {
        throw new BadRequestException('Selecciona una categoría válida.');
      }
      this.operational(bus);
      const pending = this.memory.reqs.filter((item) => item.busId === id).length;
      if (bus.occupancy + pending >= bus.max) {
        throw new BadRequestException('La unidad está llena. Elige otro micro.');
      }
      const ticket: Ticket = {
        id: this.memory.nextId('T'), busId: id, line: bus.line, internal: bus.internal,
        fare: this.fares.amount(category), category,
        fareReason: 'Tarifa en efectivo según categoría declarada',
        method: 'Efectivo', at: Date.now(), status: 'abordado',
        receiptNo: this.memory.nextReceipt(),
      };
      this.memory.tickets.push(ticket);
      changeOccupancy(this.memory, bus, bus.occupancy + 1, 'subida', profile.userId, ticket.id);
      this.audit.log(profile, 'efectivo.registrar', ticket.id, 'ok',
        `${id}: Bs ${ticket.fare.toFixed(2)}; ${category}.`);
      this.memory.events.emit();
      return { ...ticket };
    } catch (error) {
      this.audit.log(profile, 'efectivo.registrar', id, 'error',
        error instanceof Error ? error.message : 'Cobro inválido.');
      throw error;
    }
  }

  reportIncident(input: unknown, authorization?: string): Incident {
    const { profile, bus } = this.driver(authorization);
    try {
      const body = objectBody(input);
      const type = body.type;
      if (type !== 'accidente' && type !== 'falla-mecanica' && type !== 'bloqueo' &&
        type !== 'averia' && type !== 'otro') {
        throw new BadRequestException('El tipo de incidente no es válido.');
      }
      const description = requiredText(body.description, 'La descripción', 5, 3000);
      const pos = body.lat === undefined && body.lng === undefined
        ? [...bus.pos] as [number, number] : position(body.lat, body.lng);
      const severity = type === 'accidente' || type === 'falla-mecanica'
        ? 'alta' : type === 'otro' ? 'baja' : 'media';
      const now = Date.now();
      const incident: Incident = {
        id: this.memory.nextId('INC'), busId: bus.id, line: bus.line,
        internal: bus.internal, type, description, pos, severity,
        status: 'reportado', at: now, updatedAt: now,
        history: [{ at: now, status: 'reportado', by: profile.userId }],
      };
      this.memory.incidents.push(incident);
      if (severity === 'alta') {
        bus.status = 'emergencia';
        this.memory.alerts.push({
          id: this.memory.nextId('A'), busId: bus.id, at: now, kind: 'incidente',
          message: `Incidente ${incident.id}: ${description}`,
        });
        this.notifyIncident(incident);
      }
      this.audit.log(profile, 'incidente.reportar', incident.id, 'ok', `${type}: ${description}`);
      this.memory.events.emit();
      return structuredClone(incident);
    } catch (error) {
      this.audit.log(profile, 'incidente.reportar', bus.id, 'error',
        error instanceof Error ? error.message : 'Incidente inválido.');
      throw error;
    }
  }

  private notifyIncident(incident: Incident): void {
    const users = new Set<string>();
    for (const ticket of this.memory.tickets) {
      const effectiveBus = ticket.transferredTo ?? ticket.busId;
      if (effectiveBus === incident.busId && ticket.status !== 'rechazado') {
        const owner = this.memory.ticketOwners.get(ticket.id);
        if (owner) users.add(owner);
      }
    }
    for (const userId of users) {
      this.notifications.push(userId, 'incidente', 'Incidente en tu micro',
        `Unidad ${incident.busId}: ${incident.description}. Estado: ${incident.status}.`);
    }
  }

  incidents(): Incident[] {
    return structuredClone([...this.memory.incidents].reverse());
  }

  updateIncident(actor: Profile, id: string, input: unknown): Incident {
    try {
      const item = this.memory.incidents.find((incident) => incident.id === id);
      if (!item) throw new NotFoundException('Incidente no encontrado.');
      const status = objectBody(input).status;
      if (status !== 'reportado' && status !== 'en-atencion' && status !== 'resuelto') {
        throw new BadRequestException('El estado del incidente no es válido.');
      }
      if (item.status === status) return structuredClone(item);
      item.status = status;
      item.updatedAt = Date.now();
      item.history.push({ at: item.updatedAt, status, by: actor.userId });
      if (status === 'resuelto') {
        for (let index = this.memory.alerts.length - 1; index >= 0; index -= 1) {
          const alert = this.memory.alerts[index];
          if (alert.kind === 'incidente' && alert.message.startsWith(`Incidente ${id}:`)) {
            this.memory.alerts.splice(index, 1);
          }
        }
        const bus = this.bus(item.busId);
        const openHigh = this.memory.incidents.some((incident) =>
          incident.busId === bus.id && incident.severity === 'alta' &&
          incident.status !== 'resuelto',
        );
        const manualEmergency = this.memory.alerts.some(
          (alert) => alert.busId === bus.id && alert.kind === 'emergencia',
        );
        if (!openHigh && !manualEmergency && bus.status === 'emergencia') bus.status = 'activo';
      } else if (item.severity === 'alta') {
        this.bus(item.busId).status = 'emergencia';
        if (!this.memory.alerts.some((alert) =>
          alert.kind === 'incidente' && alert.message.startsWith(`Incidente ${id}:`))) {
          this.memory.alerts.push({
            id: this.memory.nextId('A'), busId: item.busId, at: Date.now(),
            kind: 'incidente', message: `Incidente ${id}: ${item.description}`,
          });
        }
      }
      if (item.severity === 'alta') this.notifyIncident(item);
      this.audit.log(actor, 'incidente.actualizar', id, 'ok', status);
      this.memory.events.emit();
      return structuredClone(item);
    } catch (error) {
      this.audit.log(actor, 'incidente.actualizar', id, 'error',
        error instanceof Error ? error.message : 'Actualización inválida.');
      throw error;
    }
  }

  redeem(input: unknown, authorization?: string): { ok: true } {
    const profile = this.auth.requireDriver(authorization);
    const code = requiredText(objectBody(input).code, 'El código', 1, 100);
    const pass = this.memory.passes.find((item) => item.code === code);
    if (!pass || pass.usedAt !== undefined || pass.expires <= Date.now()) {
      throw new BadRequestException('El pase no es válido, ya fue utilizado o está vencido.');
    }
    this.auth.requireDriver(authorization, pass.toBus);
    this.operational(this.bus(pass.toBus));
    pass.usedAt = Date.now();
    this.audit.log(profile, 'pase.canjear', pass.id, 'ok', pass.toBus);
    this.memory.events.emit();
    return { ok: true };
  }
}
