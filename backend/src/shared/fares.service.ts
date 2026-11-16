import { BadRequestException, Injectable } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Category, Fares, Profile } from '../micros/models';
import { money, objectBody, requiredText } from '../micros/input';
import { AuditService } from './audit.service';

@Injectable()
export class FaresService {
  constructor(
    private readonly memory: MemoryService,
    private readonly audit: AuditService,
  ) {}

  current(): Fares {
    return { ...this.memory.fareHistory[this.memory.fareHistory.length - 1] };
  }

  amount(category: Category): number {
    return this.current()[category];
  }

  history(): { current: Fares; history: Fares[] } {
    return { current: this.current(), history: structuredClone(this.memory.fareHistory) };
  }

  update(actor: Profile, input: unknown): Fares {
    try {
      const body = objectBody(input);
      const reason = requiredText(body.reason, 'El motivo', 5);
      const next = this.current();
      let changed = false;
      for (const category of ['general', 'escolar', 'universitario'] as const) {
        if (body[category] !== undefined) {
          next[category] = money(body[category], 0.01, 50);
          changed = true;
        }
      }
      if (!changed) throw new BadRequestException('Indica al menos una tarifa.');
      next.validFrom = Date.now();
      this.memory.fareHistory.push(next);
      this.audit.log(actor, 'tarifas.actualizar', 'tarifas', 'ok', reason);
      return { ...next };
    } catch (error) {
      this.audit.log(
        actor, 'tarifas.actualizar', 'tarifas', 'error',
        error instanceof Error ? error.message : 'Solicitud inválida.',
      );
      throw error;
    }
  }
}
