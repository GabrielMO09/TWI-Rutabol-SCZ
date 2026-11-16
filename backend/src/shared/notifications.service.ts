import { Injectable } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Notification } from '../micros/models';

@Injectable()
export class NotificationsService {
  constructor(private readonly memory: MemoryService) {}

  push(userId: string, kind: string, title: string, body: string): Notification {
    const notification: Notification = {
      id: this.memory.nextId('N'),
      at: Date.now(),
      kind,
      title,
      body,
      read: false,
    };
    const items = this.memory.notifications.get(userId) ?? [];
    items.push(notification);
    this.memory.notifications.set(userId, items);
    this.memory.events.emit();
    return structuredClone(notification);
  }
}
