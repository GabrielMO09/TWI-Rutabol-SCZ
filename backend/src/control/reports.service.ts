import { BadRequestException, Injectable } from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Ticket } from '../micros/models';
import { roundMoney } from '../micros/input';

export function ticketTotals(tickets: Ticket[]) {
  const valid = tickets.filter((ticket) => ticket.status !== 'rechazado');
  const recaudacionPorCategoria = { general: 0, escolar: 0, universitario: 0 };
  for (const ticket of valid) {
    recaudacionPorCategoria[ticket.category] = roundMoney(
      recaudacionPorCategoria[ticket.category] + ticket.fare,
    );
  }
  return {
    viajes: valid.length,
    recaudacion: roundMoney(valid.reduce((sum, ticket) => sum + ticket.fare, 0)),
    recaudacionPorCategoria,
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly memory: MemoryService) {}

  report(query: Record<string, unknown>) {
    const from = this.date(query.from, 0);
    const to = this.date(query.to, Date.now());
    if (from > to) throw new BadRequestException('La fecha inicial no puede superar la final.');
    const line = query.line;
    if (line !== undefined && (typeof line !== 'string' || !line.trim())) {
      throw new BadRequestException('La línea no es válida.');
    }
    const format = query.format ?? 'json';
    if (format !== 'json' && format !== 'csv') {
      throw new BadRequestException('El formato debe ser json o csv.');
    }
    const tickets = this.memory.tickets.filter((ticket) =>
      ticket.at >= from && ticket.at <= to && (line === undefined || ticket.line === line),
    );
    const rows = tickets.map((ticket) => ({
      ticketId: ticket.id, at: ticket.at, line: ticket.line, internal: ticket.internal,
      category: ticket.category, fare: ticket.fare, method: ticket.method, status: ticket.status,
    }));
    const totals = ticketTotals(tickets);
    if (format === 'json') return { format: 'json' as const, data: { rows, totals } };
    const header = ['ticketId', 'at', 'line', 'internal', 'category', 'fare', 'method', 'status'];
    const lines = [
      header.join(','),
      ...rows.map((row) => [
        row.ticketId, row.at, row.line, row.internal, row.category,
        row.fare, row.method, row.status,
      ].map((value) => this.cell(value)).join(',')),
    ];
    return { format: 'csv' as const, data: '\uFEFF' + lines.join('\r\n') + '\r\n' };
  }

  private date(value: unknown, fallback: number): number {
    if (value === undefined) return fallback;
    if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !/^\d+$/.test(value))) {
      throw new BadRequestException('Las fechas deben ser milisegundos válidos.');
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > 8640000000000000) {
      throw new BadRequestException('Las fechas deben ser milisegundos válidos.');
    }
    return number;
  }

  private cell(value: string | number): string {
    let result = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(result)) result = `'${result}`;
    return `"${result.replace(/"/g, '""')}"`;
  }
}
