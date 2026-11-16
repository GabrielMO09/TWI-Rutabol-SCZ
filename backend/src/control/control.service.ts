import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Bus, Line, Profile } from '../micros/models';
import { maskCode, objectBody, requiredText } from '../micros/input';
import { AccreditationService } from '../shared/accreditation.service';
import { AuditService } from '../shared/audit.service';
import { NotificationsService } from '../shared/notifications.service';
import { hashPassword } from '../shared/security';
import { interpolate } from '../shared/geo';
import { booleanValue, integer, waypoints } from '../ops/validation';
import { syncCapacity } from '../ops/occupancy';
import { ticketTotals } from './reports.service';

export const HEALTH_IDS = [
  'buses-sin-senal',
  'buses-sobre-aforo',
  'buses-en-emergencia',
  'jornadas-sin-iniciar',
  'incidentes-sin-atender',
  'recargas-pendientes',
  'acreditaciones-pendientes',
  'reclamos-sin-responder',
  'api-tiempo-real',
  'simulador-gps',
] as const;

@Injectable()
export class ControlService {
  constructor(
    private readonly memory: MemoryService,
    private readonly accreditation: AccreditationService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private command<T>(actor: Profile, action: string, target: string, operation: () => T): T {
    try {
      const result = operation();
      this.audit.log(actor, action, target, 'ok', 'Operación completada.');
      this.memory.events.emit();
      return structuredClone(result);
    } catch (error) {
      this.audit.log(actor, action, target, 'error',
        error instanceof Error ? error.message : 'Operación inválida.');
      throw error;
    }
  }

  private bus(id: string): Bus {
    const bus = this.memory.buses.find((item) => item.id === id);
    if (!bus) throw new NotFoundException('Unidad no encontrada.');
    return bus;
  }

  private line(id: string): Line {
    const line = this.memory.lines.find((item) => item.id === id);
    if (!line) throw new NotFoundException('Línea no encontrada.');
    return line;
  }

  private identifier(value: unknown, label: string): string {
    const result = requiredText(value, label, 1, 30);
    if (!/^[A-Za-z0-9]+$/.test(result)) {
      throw new BadRequestException(`${label} solo puede contener letras y números.`);
    }
    return result;
  }

  private plate(value: unknown, exceptId?: string): string {
    const plate = requiredText(value, 'La placa', 3, 20).toUpperCase();
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(plate)) {
      throw new BadRequestException('La placa solo puede contener letras, números y guiones.');
    }
    if (this.memory.buses.some((bus) => bus.id !== exceptId && bus.plate.toUpperCase() === plate)) {
      throw new ConflictException('La placa ya está registrada en otra unidad.');
    }
    return plate;
  }

  private busStatus(value: unknown): Bus['status'] {
    if (value !== 'activo' && value !== 'descanso' && value !== 'emergencia') {
      throw new BadRequestException('El estado de la unidad no es válido.');
    }
    return value;
  }

  private pin(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
      throw new BadRequestException('El PIN del chofer debe tener 4 dígitos.');
    }
    return value;
  }

  users() {
    return [...this.memory.users.values()].map(({ profile, createdAt }) => ({
      userId: profile.userId,
      name: profile.name,
      role: profile.role,
      ...(profile.category ? { category: profile.category } : {}),
      codeMasked: maskCode(profile.code ?? ''),
      status: profile.status,
      ...(profile.role === 'pasajero' ? {
        accreditationStatus: this.accreditation.get(profile.userId)?.status ?? 'no-requerida',
        balance: this.memory.wallets.get(profile.userId)?.balance ?? 0,
      } : {}),
      createdAt,
    }));
  }

  setUserStatus(actor: Profile, id: string, input: unknown) {
    return this.command(actor, 'usuario.estado', id, () => {
      const user = this.memory.users.get(id);
      if (!user) throw new NotFoundException('Usuario no encontrado.');
      const status = objectBody(input).status;
      if (status !== 'activo' && status !== 'suspendido') {
        throw new BadRequestException('El estado debe ser activo o suspendido.');
      }
      if (id === actor.userId && status === 'suspendido') {
        throw new BadRequestException('No puedes suspender tu propia cuenta.');
      }
      user.profile.status = status;
      if (status === 'suspendido') {
        for (const [token, session] of this.memory.sessions) {
          if (session.userId === id) this.memory.sessions.delete(token);
        }
        if (user.profile.role === 'chofer' && user.profile.busId) {
          this.bus(user.profile.busId).onDuty = false;
        }
      }
      this.notifications.push(id, 'cuenta', 'Estado de tu cuenta',
        `Tu cuenta está ${status === 'activo' ? 'activa' : 'suspendida'}.`);
      return { userId: id, status };
    });
  }

  lines() {
    return structuredClone(this.memory.lines);
  }

  createLine(actor: Profile, input: unknown): Line {
    return this.command(actor, 'linea.crear', 'líneas', () => {
      const body = objectBody(input);
      const id = this.identifier(body.id, 'La línea');
      if (this.memory.lines.some((line) => line.id === id)) {
        throw new ConflictException('La línea ya existe.');
      }
      const line: Line = {
        id, name: requiredText(body.name, 'El nombre', 2, 150),
        waypoints: waypoints(body.waypoints), active: true,
      };
      this.memory.lines.push(line);
      return line;
    });
  }

  updateLine(actor: Profile, id: string, input: unknown): Line {
    return this.command(actor, 'linea.actualizar', id, () => {
      const line = this.line(id);
      const body = objectBody(input);
      const next: Line = {
        ...line,
        name: body.name === undefined ? line.name : requiredText(body.name, 'El nombre', 2, 150),
        waypoints: body.waypoints === undefined ? line.waypoints : waypoints(body.waypoints),
        active: body.active === undefined ? line.active : booleanValue(body.active),
      };
      Object.assign(line, next);
      for (const bus of this.memory.buses.filter((item) => item.line === id)) {
        if (!line.active) bus.onDuty = false;
        this.memory.refreshBus(bus);
      }
      return line;
    });
  }

  buses(): Bus[] {
    return this.memory.buses.map((bus) => {
      this.memory.refreshBus(bus);
      return structuredClone(bus);
    });
  }

  createBus(actor: Profile, input: unknown): Bus {
    return this.command(actor, 'bus.crear', 'buses', () => {
      const body = objectBody(input);
      const line = this.line(this.identifier(body.line, 'La línea'));
      const internal = this.identifier(body.internal, 'El interno');
      const id = `${line.id}-${internal}`;
      if (this.memory.buses.some((bus) => bus.id === id)) {
        throw new ConflictException('Ya existe una unidad con esa línea e interno.');
      }
      const plate = this.plate(body.plate);
      const max = integer(body.max, 18, 25, 'El aforo');
      const bus: Bus = {
        id, line: line.id, internal, plate, max, occupancy: 0,
        progress: 0, direction: 'ida', pos: interpolate(line.waypoints, 0),
        source: 'simulado', lastSeen: Date.now(), stale: false,
        onDuty: false, status: 'activo', active: true,
      };
      this.memory.buses.push(bus);
      return bus;
    });
  }

  updateBus(actor: Profile, id: string, input: unknown): Bus {
    return this.command(actor, 'bus.actualizar', id, () => {
      const bus = this.bus(id);
      const body = objectBody(input);
      const next = {
        plate: body.plate === undefined ? bus.plate : this.plate(body.plate, id),
        max: body.max === undefined ? bus.max : integer(body.max, 18, 25, 'El aforo'),
        active: body.active === undefined ? bus.active : booleanValue(body.active),
        status: body.status === undefined ? bus.status : this.busStatus(body.status),
      };
      const highIncident = this.memory.incidents.some((item) =>
        item.busId === id && item.severity === 'alta' && item.status !== 'resuelto',
      );
      if (next.status !== 'emergencia' && highIncident) {
        throw new BadRequestException('Primero resuelve los incidentes graves de la unidad.');
      }
      const enteringEmergency = bus.status !== 'emergencia' && next.status === 'emergencia';
      Object.assign(bus, next);
      if (!bus.active) bus.onDuty = false;
      if (bus.status === 'emergencia' && !highIncident &&
        !this.memory.alerts.some((item) => item.busId === id && item.kind === 'emergencia')) {
        this.memory.alerts.push({
          id: this.memory.nextId('A'), busId: id, at: Date.now(),
          kind: 'emergencia', message: 'Emergencia declarada por el Centro de Control.',
        });
      }
      if (bus.status !== 'emergencia') {
        for (let index = this.memory.alerts.length - 1; index >= 0; index -= 1) {
          const alert = this.memory.alerts[index];
          if (alert.busId === id && alert.kind === 'emergencia') this.memory.alerts.splice(index, 1);
        }
      }
      if (enteringEmergency) {
        const owners = new Set(this.memory.tickets
          .filter((ticket) => (ticket.transferredTo ?? ticket.busId) === id &&
            ticket.status !== 'rechazado')
          .map((ticket) => this.memory.ticketOwners.get(ticket.id)));
        for (const owner of owners) {
          if (owner) this.notifications.push(owner, 'emergencia', 'Emergencia en tu micro',
            `La unidad ${id} está en emergencia. Sigue las indicaciones del chofer.`);
        }
      }
      syncCapacity(this.memory, bus);
      this.memory.refreshBus(bus);
      return bus;
    });
  }

  drivers() {
    return [...this.memory.users.values()]
      .filter((user) => user.profile.role === 'chofer')
      .map(({ profile, createdAt }) => ({
        userId: profile.userId, name: profile.name, line: profile.line,
        internal: profile.internal, busId: profile.busId,
        active: profile.status === 'activo', createdAt,
      }));
  }

  createDriver(actor: Profile, input: unknown) {
    return this.command(actor, 'chofer.asignar', 'choferes', () => {
      const body = objectBody(input);
      const line = this.identifier(body.line, 'La línea');
      const internal = this.identifier(body.internal, 'El interno');
      const bus = this.bus(`${line}-${internal}`);
      const userId = `chofer:${bus.id}`;
      if (this.memory.users.has(userId) ||
        [...this.memory.users.values()].some((user) =>
          user.profile.role === 'chofer' && user.profile.busId === bus.id)) {
        throw new ConflictException('La unidad ya tiene un conductor asignado.');
      }
      const name = requiredText(body.name, 'El nombre', 3, 120);
      const pin = this.pin(body.pin);
      this.memory.addUser({
        userId, name, role: 'chofer', status: 'activo', line, internal, busId: bus.id,
      }, pin);
      return this.drivers().find((item) => item.userId === userId)!;
    });
  }

  updateDriver(actor: Profile, id: string, input: unknown) {
    return this.command(actor, 'chofer.actualizar', id, () => {
      const user = this.memory.users.get(id);
      if (!user || user.profile.role !== 'chofer') {
        throw new NotFoundException('Conductor no encontrado.');
      }
      const body = objectBody(input);
      const name = body.name === undefined ? user.profile.name
        : requiredText(body.name, 'El nombre', 3, 120);
      const active = body.active === undefined
        ? user.profile.status === 'activo' : booleanValue(body.active);
      const pin = body.pin === undefined ? undefined : this.pin(body.pin);
      user.profile.name = name;
      user.profile.status = active ? 'activo' : 'suspendido';
      if (pin !== undefined) user.secret = hashPassword(pin);
      if (!active || pin !== undefined) {
        for (const [token, session] of this.memory.sessions) {
          if (session.userId === id) this.memory.sessions.delete(token);
        }
      }
      if (!active) this.bus(user.profile.busId!).onDuty = false;
      return this.drivers().find((item) => item.userId === id)!;
    });
  }

  overview() {
    const now = Date.now();
    const buses = this.buses();
    const active = buses.filter((bus) => bus.active);
    const service = active.filter((bus) => bus.onDuty && !bus.stale &&
      bus.status === 'activo' &&
      this.memory.lines.some((line) => line.id === bus.line && line.active));
    const pendingRecharges = [...this.memory.recharges.values()].flat()
      .filter((item) => item.status === 'pendiente');
    const incidents = this.memory.incidents.filter((item) => item.status !== 'resuelto');
    const claims = this.memory.claims.filter(
      (item) => item.status !== 'resuelto' && item.status !== 'rechazado',
    );
    const accreditations = this.accreditation.list('pendiente');
    const occupancy = (items: Bus[]) => {
      const capacity = items.reduce((sum, bus) => sum + bus.max, 0);
      return capacity === 0 ? 0
        : Math.round(items.reduce((sum, bus) => sum + bus.occupancy, 0) / capacity * 10000) / 100;
    };
    const totals = ticketTotals(this.memory.tickets);
    const health: {
      id: string; title: string; ok: boolean;
      severity: 'critica' | 'aviso' | 'info'; detail: string;
    }[] = [];
    const check = (
      id: string, title: string, count: number,
      severity: 'critica' | 'aviso' | 'info', unit: string,
    ) => health.push({
      id, title, ok: count === 0, severity,
      detail: count === 0 ? 'Sin pendientes.' : `${count} ${unit}.`,
    });
    check(HEALTH_IDS[0], 'Buses sin señal', active.filter((bus) => bus.stale).length,
      'aviso', 'unidades sin señal durante al menos 30 segundos');
    check(HEALTH_IDS[1], 'Buses sobre aforo', active.filter((bus) => bus.occupancy > bus.max).length,
      'critica', 'unidades con ocupación superior al aforo');
    check(HEALTH_IDS[2], 'Buses en emergencia', active.filter((bus) => bus.status === 'emergencia').length,
      'critica', 'unidades en emergencia');
    check(HEALTH_IDS[3], 'Jornadas sin iniciar', active.filter((bus) => !bus.onDuty).length,
      'aviso', 'unidades sin jornada activa');
    check(HEALTH_IDS[4], 'Incidentes sin atender',
      incidents.filter((item) => item.status === 'reportado' && now - item.at > 300000).length,
      'critica', 'incidentes reportados hace más de 5 minutos');
    check(HEALTH_IDS[5], 'Recargas pendientes',
      pendingRecharges.filter((item) => now - item.at > 10000).length,
      'aviso', 'recargas pendientes hace más de 10 segundos');
    check(HEALTH_IDS[6], 'Acreditaciones pendientes', accreditations.length,
      'aviso', 'acreditaciones pendientes');
    check(HEALTH_IDS[7], 'Reclamos sin responder', claims.filter((item) => !item.response).length,
      'aviso', 'reclamos abiertos sin respuesta');
    health.push({
      id: HEALTH_IDS[8], title: 'API y tiempo real', ok: true, severity: 'info',
      detail: 'API disponible y canal SSE habilitado en este proceso.',
    });
    health.push({
      id: HEALTH_IDS[9], title: 'Simulador GPS', severity: 'aviso',
      ...this.memory.simulatorHealth(),
    });
    return {
      kpis: {
        busesActivos: active.length,
        busesEnServicio: service.length,
        busesSinSenal: active.filter((bus) => bus.stale).length,
        ...totals,
        ocupacionPromedioPct: occupancy(active),
        incidentesAbiertos: incidents.length,
        reclamosAbiertos: claims.length,
        acreditacionesPendientes: accreditations.length,
        trasbordos: this.memory.passes.length,
        recargasPendientes: pendingRecharges.length,
      },
      byLine: this.memory.lines.map((line) => {
        const lineBuses = active.filter((bus) => bus.line === line.id);
        const lineTotals = ticketTotals(this.memory.tickets.filter((ticket) => ticket.line === line.id));
        return {
          line: line.id, viajes: lineTotals.viajes, recaudacion: lineTotals.recaudacion,
          ocupacionPromedioPct: occupancy(lineBuses), buses: lineBuses.length,
        };
      }),
      health,
      buses,
      alerts: structuredClone(this.memory.alerts),
      incidents: structuredClone(this.memory.incidents),
    };
  }
}
