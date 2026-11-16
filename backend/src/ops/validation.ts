import { BadRequestException } from '@nestjs/common';
import type { Position } from '../micros/models';

export function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(`${label} debe ser un entero entre ${min} y ${max}.`);
  }
  return value;
}

export function booleanValue(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException('El valor de active debe ser booleano.');
  }
  return value;
}

export function coordinate(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequestException('Las coordenadas están fuera del rango permitido.');
  }
  return value;
}

export function position(lat: unknown, lng: unknown): Position {
  return [coordinate(lat, -90, 90), coordinate(lng, -180, 180)];
}

export function waypoints(value: unknown): Position[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 1000) {
    throw new BadRequestException('La línea debe tener entre 2 y 1000 puntos.');
  }
  return value.map((point: unknown) => {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new BadRequestException('Cada punto debe contener latitud y longitud.');
    }
    return position(point[0], point[1]);
  });
}
