import { HttpException, Injectable } from '@nestjs/common';
import type { MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { defer, finalize, Subject } from 'rxjs';
import type { Observable } from 'rxjs';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly subject = new Subject<MessageEvent>();
  readonly stream = this.subject.asObservable();
  private readonly connections = new Map<string, number>();
  private timer?: ReturnType<typeof setTimeout>;

  connect(ip: string): Observable<MessageEvent> {
    return defer(() => {
      const active = this.connections.get(ip) ?? 0;
      if (active >= 20) {
        throw new HttpException('Demasiadas conexiones de eventos desde esta IP.', 429);
      }
      this.connections.set(ip, active + 1);
      return this.stream.pipe(finalize(() => {
        const remaining = (this.connections.get(ip) ?? 1) - 1;
        if (remaining === 0) this.connections.delete(ip);
        else this.connections.set(ip, remaining);
      }));
    });
  }

  emit(): void {
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.subject.next({ data: { type: 'tick' } });
    }, 300);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.subject.complete();
  }
}
