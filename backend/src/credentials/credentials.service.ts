import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { MemoryService } from '../micros/memory.service';
import { objectBody, maskCode, text } from '../micros/input';
import { AccreditationService } from '../shared/accreditation.service';

interface Payload {
  n: string;
  e: number;
}

@Injectable()
export class CredentialsService {
  private readonly secret: string;

  constructor(
    private readonly memory: MemoryService,
    private readonly accreditation: AccreditationService,
  ) {
    const configured = process.env.CREDENTIAL_SECRET;
    if (!configured && process.env.NODE_ENV === 'production') {
      throw new Error('Debes definir CREDENTIAL_SECRET para emitir credenciales en producción.');
    }
    if (!configured) {
      Logger.warn('CREDENTIAL_SECRET no está definida. Se usará un secreto aleatorio hasta reiniciar.', CredentialsService.name);
    }
    this.secret = configured || randomBytes(32).toString('hex');
  }

  issue(userId: string) {
    const profile = this.accreditation.profile(userId);
    const expiresAt = Date.now() + 60000;
    const nonce = randomBytes(24).toString('base64url');
    const payload: Payload = { n: nonce, e: expiresAt };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(encoded).digest('base64url');
    this.memory.credentials.set(nonce, { userId, expiresAt });
    this.memory.events.emit();
    return {
      token: `${encoded}.${signature}`,
      expiresAt,
      category: profile.category,
      fareCategory: profile.fareCategory,
      status: profile.accreditation?.status ?? profile.status,
    };
  }

  verify(input: unknown) {
    const token = text(objectBody(input).token);
    const invalid = (reason: string) => ({ valid: false as const, reason });
    if (token.length > 4096) return invalid('Firma inválida.');
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
      return invalid('Firma inválida.');
    }
    const [encoded, signature] = parts;
    const expected = createHmac('sha256', this.secret).update(encoded).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return invalid('Firma inválida.');
    }
    let payload: Payload;
    try {
      const value: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!value || typeof value !== 'object') return invalid('Código inválido.');
      const object = value as Record<string, unknown>;
      if (
        Object.keys(object).length !== 2 ||
        typeof object.n !== 'string' ||
        typeof object.e !== 'number' ||
        !Number.isFinite(object.e)
      ) return invalid('Código inválido.');
      payload = { n: object.n, e: object.e };
    } catch {
      return invalid('Código inválido.');
    }
    if (payload.e <= Date.now()) return invalid('Código expirado.');
    const saved = this.memory.credentials.get(payload.n);
    if (!saved || saved.expiresAt !== payload.e) {
      return invalid('Código inválido.');
    }
    if (saved.usedAt !== undefined) return invalid('Código ya utilizado');
    const user = this.memory.users.get(saved.userId);
    if (!user || user.profile.role !== 'pasajero') return invalid('Código inválido.');
    if (user.profile.status === 'suspendido') return invalid('La cuenta está suspendida.');
    const profile = this.accreditation.profile(saved.userId);
    saved.usedAt = Date.now();
    this.memory.events.emit();
    return {
      valid: true,
      name: profile.name,
      photo: profile.photo,
      fareCategory: profile.fareCategory,
      accreditationStatus: profile.accreditation?.status ?? 'no-requerida',
      codeMasked: maskCode(profile.code ?? ''),
    };
  }
}
