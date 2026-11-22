import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { Secret } from '../micros/models';

export function hashPassword(password: string): Promise<Secret> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, hash) => {
      if (error) reject(error);
      else resolve({ salt, hash });
    });
  });
}

export async function matchesPassword(
  secret: Promise<Secret>,
  candidate: unknown,
): Promise<boolean> {
  if (typeof candidate !== 'string' || candidate.length > 1024) return false;
  const saved = await secret;
  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(candidate, saved.salt, saved.hash.length, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  return timingSafeEqual(saved.hash, hash);
}

export function randomCode(): string {
  return String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, '0');
}

export function matchesCode(saved: string, candidate: string): boolean {
  const left = Buffer.from(saved);
  const right = Buffer.from(candidate);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Clave de sesión: en memoria y en la BD solo vive el hash, nunca el token en claro. */
export function sessionKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Banderas de entorno: apagadas por defecto (producción); se activan con =true en backend/.env. */
export const exposeDevCode = (): boolean => process.env.EXPOSE_DEV_CODE === 'true';
export const demoSeed = (): boolean => process.env.ENABLE_DEMO_SEED === 'true';
/** Recargas de demostración: acreditan saldo SIN pago real. Solo para pruebas; en producción debe estar apagada hasta tener pasarela. */
export const demoRecharge = (): boolean => process.env.ENABLE_DEMO_RECHARGE === 'true';
