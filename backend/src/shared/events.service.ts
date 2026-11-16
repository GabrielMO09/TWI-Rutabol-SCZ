import { Injectable } from '@nestjs/common';
import type { MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly subject = new Subject<MessageEvent>();
  readonly stream = this.subject.asObservable();

  emit(): void {
    this.subject.next({ data: { type: 'tick' } });
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
