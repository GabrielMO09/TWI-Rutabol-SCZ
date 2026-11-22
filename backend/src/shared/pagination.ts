import { BadRequestException } from '@nestjs/common';

const MAX_LIMIT = 500;

function whole(value: string | undefined, name: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new BadRequestException(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
  return number;
}

/** Sin limit ni offset devuelve la lista completa (compatible con el frontend actual); con ellos, una página. */
export function paginate<T>(items: T[], limit?: string, offset?: string): T[] {
  const size = whole(limit, 'limit', 1, MAX_LIMIT);
  const start = whole(offset, 'offset', 0, Number.MAX_SAFE_INTEGER);
  if (size === undefined && start === undefined) return items;
  return items.slice(start ?? 0, (start ?? 0) + (size ?? MAX_LIMIT));
}
