import { BadRequestException } from '@nestjs/common';

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('El cuerpo debe ser un objeto JSON.');
  }
  return value as Record<string, unknown>;
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function requiredText(value: unknown, label: string, min = 1, max = 500): string {
  const result = text(value);
  if (result.length < min || result.length > max) {
    throw new BadRequestException(`${label}: entre ${min} y ${max} caracteres.`);
  }
  return result;
}

export function money(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  ) {
    throw new BadRequestException(
      `El monto debe estar entre ${min} y ${max}, con un máximo de dos decimales.`,
    );
  }
  return Math.round(value * 100) / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function idempotencyKey(value: unknown): string {
  return requiredText(value, 'La clave de idempotencia es obligatoria', 1, 128);
}

export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6 || value.length > 1024) {
    throw new BadRequestException('La contraseña debe tener entre 6 y 1024 caracteres.');
  }
  return value;
}

export function maskCode(code: string): string {
  return `****${code.slice(-4)}`;
}
