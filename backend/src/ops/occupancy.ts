import { BadRequestException } from '@nestjs/common';
import type { MemoryService } from '../micros/memory.service';
import type { Bus, OccupancyEvent } from '../micros/models';

export function syncCapacity(memory: MemoryService, bus: Bus): void {
  const alerts = memory.alerts.filter(
    (item) => item.busId === bus.id && item.kind === 'aforo',
  );
  if (bus.occupancy < bus.max || !bus.active) {
    for (const alert of alerts) {
      memory.alerts.splice(memory.alerts.indexOf(alert), 1);
    }
  } else if (alerts.length === 0) {
    memory.alerts.push({
      id: memory.nextId('A'),
      busId: bus.id,
      at: Date.now(),
      kind: 'aforo',
      message: `La unidad ${bus.id} alcanzó o superó su aforo de ${bus.max} pasajeros.`,
    });
  }
}

export function changeOccupancy(
  memory: MemoryService,
  bus: Bus,
  to: number,
  kind: OccupancyEvent['kind'],
  by: string,
  reason?: string,
): void {
  if (!Number.isInteger(to) || to < 0 || to > 60) {
    throw new BadRequestException('La ocupación debe ser un entero entre 0 y 60.');
  }
  if (to > bus.max && to > bus.occupancy) {
    throw new BadRequestException(`La ocupación no puede superar el aforo autorizado (${bus.max}).`);
  }
  const from = bus.occupancy;
  bus.occupancy = to;
  if (from !== to || kind === 'correccion') {
    memory.occupancyEvents.push({
      id: memory.nextId('OC'),
      at: Date.now(),
      busId: bus.id,
      kind,
      from,
      to,
      by,
      ...(reason ? { reason } : {}),
    });
  }
  syncCapacity(memory, bus);
}
