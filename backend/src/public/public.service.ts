import { BadRequestException, Injectable } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import { haversine } from '../shared/geo';

@Injectable()
export class PublicService {
  constructor(private readonly memory: MemoryService) {}

  lines() {
    return structuredClone(this.memory.lines.filter((line) => line.active));
  }

  incidents() {
    return this.memory.incidents
      .filter((incident) => incident.status !== 'resuelto')
      .map((incident) => ({
        id: incident.id,
        busId: incident.busId,
        line: incident.line,
        internal: incident.internal,
        type: incident.type,
        description: incident.description,
        ...(incident.pos ? { pos: [...incident.pos] } : {}),
        severity: incident.severity,
        status: incident.status,
        at: incident.at,
        updatedAt: incident.updatedAt,
        history: incident.history.map((entry) => ({
          at: entry.at, status: entry.status, by: 'Rutabol',
        })),
      }));
  }

  world() {
    const buses = this.memory.buses.filter((bus) => bus.active).map((bus) => {
      this.memory.refreshBus(bus);
      return structuredClone(bus);
    });
    const ids = new Set(buses.map((bus) => bus.id));
    return {
      buses,
      alerts: structuredClone(this.memory.alerts.filter((alert) => ids.has(alert.busId))),
      incidents: this.incidents(),
    };
  }

  nearby(query: Record<string, unknown>) {
    const latitude = this.coordinate(query.lat, -90, 90);
    const longitude = this.coordinate(query.lng, -180, 180);
    const radiusKm = query.radiusKm === undefined
      ? 5 : this.coordinate(query.radiusKm, Number.MIN_VALUE, 20040);
    const line = query.line;
    const direction = query.direction;
    if (line !== undefined && (typeof line !== 'string' || !line.trim())) {
      throw new BadRequestException('La línea no es válida.');
    }
    if (direction !== undefined && direction !== 'ida' && direction !== 'vuelta') {
      throw new BadRequestException('La dirección debe ser ida o vuelta.');
    }
    const items = this.memory.buses.flatMap((bus) => {
      this.memory.refreshBus(bus);
      if (!bus.active || !bus.onDuty || bus.stale || bus.status !== 'activo' ||
        !this.memory.lines.some((entry) => entry.id === bus.line && entry.active) ||
        (line !== undefined && bus.line !== line) ||
        (direction !== undefined && bus.direction !== direction)) return [];
      const distanceKm = haversine([latitude, longitude], bus.pos);
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) return [];
      return [{
        bus: structuredClone(bus), distanceKm,
        etaMin: distanceKm / 18 * 60, etaReliable: true,
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm);
    return { radiusKm, items };
  }

  private coordinate(value: unknown, min: number, max: number): number {
    if ((typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'string' && !value.trim())) {
      throw new BadRequestException('Las coordenadas y el radio deben ser números válidos.');
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      throw new BadRequestException('Las coordenadas o el radio están fuera del rango permitido.');
    }
    return number;
  }
}
