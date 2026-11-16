import { Injectable } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { AuditEntry, Profile } from '../micros/models';

@Injectable()
export class AuditService {
  constructor(private readonly memory: MemoryService) {}

  log(
    actor: Pick<Profile, 'userId' | 'role'>,
    action: string,
    target: string,
    result: AuditEntry['result'],
    detail: string,
  ): AuditEntry {
    const entry: AuditEntry = {
      id: this.memory.nextId('AUD'),
      at: Date.now(),
      actorId: actor.userId,
      actorRole: actor.role,
      action,
      target,
      result,
      detail,
    };
    this.memory.audit.push(entry);
    this.memory.events.emit();
    return structuredClone(entry);
  }
}
