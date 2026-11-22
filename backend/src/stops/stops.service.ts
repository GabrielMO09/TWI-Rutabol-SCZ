import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { objectBody, requiredText } from '../micros/input';
import { MemoryService } from '../micros/memory.service';
import type { Profile } from '../micros/models';
import { booleanValue, integer, position } from '../ops/validation';
import { AuditService } from '../shared/audit.service';
import { StopsStore, stopDescription } from './stops.store';
import type { Stop } from './stops.store';

@Injectable()
export class StopsService {
  constructor(
    private readonly memory: MemoryService,
    private readonly audit: AuditService,
    private readonly store: StopsStore,
  ) {}

  list() {
    return this.sorted([...this.store.stops.values()]);
  }

  publicList(value?: unknown) {
    const lines = value === undefined
      ? this.memory.lines
      : [this.findLine(requiredText(value, 'La línea', 1, 30))];
    const activeLines = new Set(lines.filter((line) => line.active).map((line) => line.id));
    return this.sorted([...this.store.stops.values()].filter(
      (stop) => stop.active && activeLines.has(stop.line),
    ));
  }

  create(actor: Profile, input: unknown) {
    const id = randomUUID();
    return this.command(actor, 'parada.crear', id, () => {
      const stop = this.read(id, objectBody(input));
      this.store.stops.set(id, stop);
      return stop;
    });
  }

  update(actor: Profile, id: string, input: unknown) {
    return this.command(actor, 'parada.actualizar', id, () => {
      const stop = this.read(id, objectBody(input), this.get(id));
      this.store.stops.set(id, stop);
      return stop;
    });
  }

  remove(actor: Profile, id: string) {
    return this.command(actor, 'parada.eliminar', id, () => {
      const stop = this.get(id);
      this.store.stops.delete(id);
      return stop;
    });
  }

  private get(id: string): Stop {
    const stop = this.store.stops.get(id);
    if (!stop) throw new NotFoundException('Parada no encontrada.');
    return stop;
  }

  private findLine(id: string) {
    const line = this.memory.lines.find((entry) => entry.id === id);
    if (!line) throw new NotFoundException('Línea no encontrada.');
    return line;
  }

  private read(id: string, body: Record<string, unknown>, current?: Stop): Stop {
    const field = (key: keyof Omit<Stop, 'id'>) =>
      body[key] === undefined ? current?.[key] : body[key];

    const line = this.findLine(requiredText(field('line'), 'La línea', 1, 30)).id;
    const name = requiredText(field('name'), 'El nombre', 1, 120);
    const rawReference = field('reference');
    if (rawReference !== undefined && typeof rawReference !== 'string') {
      throw new BadRequestException('La referencia debe ser texto.');
    }
    const reference = (rawReference ?? '').trim();
    if (reference.length > 180) {
      throw new BadRequestException('La referencia admite hasta 180 caracteres.');
    }

    const [lat, lng] = position(field('lat'), field('lng'));
    const order = integer(field('order'), 1, 2147483647, 'El orden');
    const rawActive = field('active');
    const active = rawActive === undefined ? true : booleanValue(rawActive);
    const stop = {
      id, line, name, reference, order, active,
      lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)),
    };
    // La descripción de punto_ruta admite hasta 250 caracteres.
    if (Array.from(stopDescription(stop)).length > 250) {
      throw new BadRequestException('El nombre y la referencia ocupan demasiado espacio juntos.');
    }
    for (const other of this.store.stops.values()) {
      if (other.id !== id && other.line === line && other.order === order) {
        throw new ConflictException('Ya existe una parada con ese orden en la línea.');
      }
    }
    return stop;
  }

  private sorted(stops: Stop[]) {
    return stops
      .sort((a, b) => a.line.localeCompare(b.line) || a.order - b.order)
      .map((stop) => ({ ...stop }));
  }

  private command(actor: Profile, action: string, id: string, operation: () => Stop): Stop {
    try {
      const stop = operation();
      this.audit.log(actor, action, id, 'ok', `Línea ${stop.line}: ${stop.name}`);
      return { ...stop };
    } catch (error) {
      this.audit.log(actor, action, id, 'error',
        error instanceof Error ? error.message : 'Operación inválida.');
      throw error;
    }
  }
}
