import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
const SAFE_TOKEN = /^[\w.:-]{1,64}$/; // ids de ruta y filtros: "17-045", "INC-000018", hashes, etc.

function scan(value: unknown, depth = 0): void {
  if (depth > 12) throw new BadRequestException('Estructura demasiado profunda.');
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS.has(key)) throw new BadRequestException('Campo no permitido.');
    scan((value as Record<string, unknown>)[key], depth + 1);
  }
}

/** Pipe global: ids/consultas con formato seguro y cuerpos sin claves de contaminación de prototipos. */
@Injectable()
export class InputPipe implements PipeTransform {
  transform(value: unknown, meta: ArgumentMetadata): unknown {
    if (meta.type === 'body') scan(value);
    else if (meta.type === 'param') this.token(value);
    else if (meta.type === 'query') {
      if (value && typeof value === 'object') Object.values(value).forEach((item) => this.token(item));
      else this.token(value);
    }
    return value;
  }

  private token(value: unknown): void {
    if (value === undefined || value === '') return;
    if (typeof value !== 'string' || !SAFE_TOKEN.test(value)) {
      throw new BadRequestException('Parámetro con formato no válido.');
    }
  }
}
