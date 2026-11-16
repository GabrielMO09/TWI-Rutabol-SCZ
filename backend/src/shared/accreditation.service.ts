import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemoryService } from '../micros/memory.service';
import type { Accreditation, Category, Profile } from '../micros/models';
import { objectBody, requiredText, text } from '../micros/input';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { matchesCode, randomCode } from './security';

@Injectable()
export class AccreditationService {
  constructor(
    private readonly memory: MemoryService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  validateCode(category: Category, code: string, exceptUserId?: string): void {
    if (category === 'universitario' && !/^[^@\s]+@upds\.edu\.bo$/i.test(code)) {
      throw new BadRequestException('Usa tu correo institucional @upds.edu.bo.');
    }
    if (category === 'escolar' && !/^[A-Za-z0-9]{8,20}$/.test(code)) {
      throw new BadRequestException('El código RUDE debe tener entre 8 y 20 caracteres.');
    }
    if (category === 'general' && !/^[A-Za-z0-9]{5,30}$/.test(code)) {
      throw new BadRequestException('Ingresa un número de CI válido.');
    }
    const normalized = code.toLowerCase();
    if (
      [...this.memory.users.values()].some(
        ({ profile }) =>
          profile.userId !== exceptUserId &&
          (profile.code?.toLowerCase() === normalized ||
            profile.userId.toLowerCase() === normalized),
      ) ||
      this.memory.accreditations.some(
        (item) => item.userId !== exceptUserId && item.code.toLowerCase() === normalized,
      )
    ) {
      throw new ConflictException('Ya existe una cuenta con ese identificador.');
    }
  }

  effective(item: Accreditation): Accreditation {
    const result = { ...item };
    if (result.validUntil !== undefined && result.validUntil <= Date.now()) {
      result.status = 'vencida';
    }
    return result;
  }

  get(userId: string): Accreditation | null {
    const item = this.memory.accreditations.find((entry) => entry.userId === userId);
    return item ? this.effective(item) : null;
  }

  profile(userId: string): Profile {
    const user = this.memory.users.get(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const profile = { ...user.profile };
    if (profile.role === 'pasajero') {
      const accreditation = this.get(userId);
      if (accreditation) profile.accreditation = accreditation;
      profile.fareCategory =
        accreditation?.status === 'aprobada' &&
        (accreditation.validUntil ?? 0) > Date.now()
          ? accreditation.type
          : 'general';
    }
    return profile;
  }

  fareReason(userId: string): string {
    const profile = this.profile(userId);
    if (profile.fareCategory === 'escolar') return 'Tarifa escolar vigente';
    if (profile.fareCategory === 'universitario') return 'Tarifa universitaria vigente';
    if (profile.accreditation) {
      return `Acreditación ${profile.accreditation.status}: tarifa general`;
    }
    return 'Tarifa general';
  }

  request(userId: string, input: unknown): {
    accreditation: Accreditation;
    devCode?: string;
  } {
    const user = this.memory.users.get(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const type = user.profile.category;
    if (type !== 'escolar' && type !== 'universitario') {
      throw new BadRequestException('Tu categoría no requiere acreditación.');
    }
    const body = objectBody(input);
    const institution = requiredText(body.institution, 'La institución', 2, 200);
    const code = requiredText(body.code, 'El identificador', 1, 200);
    this.validateCode(type, code, userId);
    const accreditation: Accreditation = {
      id: this.memory.nextId('AC'),
      userId,
      type,
      institution,
      code,
      status: 'pendiente',
      emailVerified: type === 'escolar',
      requestedAt: Date.now(),
    };
    const index = this.memory.accreditations.findIndex((item) => item.userId === userId);
    if (index >= 0) this.memory.accreditations.splice(index, 1, accreditation);
    else this.memory.accreditations.push(accreditation);
    this.memory.emailCodes.delete(userId);
    let devCode: string | undefined;
    if (type === 'universitario') {
      devCode = randomCode();
      this.memory.emailCodes.set(userId, {
        code: devCode,
        expiresAt: Date.now() + 15 * 60000,
        attempts: 0,
      });
    }
    this.memory.events.emit();
    return { accreditation: { ...accreditation }, ...(devCode ? { devCode } : {}) };
  }

  confirmEmail(userId: string, input: unknown): Accreditation {
    const body = objectBody(input);
    const item = this.memory.accreditations.find((entry) => entry.userId === userId);
    const saved = this.memory.emailCodes.get(userId);
    if (!item || item.type !== 'universitario' || !saved || saved.expiresAt <= Date.now()) {
      throw new BadRequestException('El código de confirmación no es válido o expiró.');
    }
    if (!matchesCode(saved.code, text(body.code))) {
      saved.attempts += 1;
      if (saved.attempts >= 5) this.memory.emailCodes.delete(userId);
      throw new BadRequestException('El código de confirmación no es válido o expiró.');
    }
    item.emailVerified = true;
    this.memory.emailCodes.delete(userId);
    this.memory.events.emit();
    return this.effective(item);
  }

  list(status?: string): Accreditation[] {
    const allowed = ['pendiente', 'aprobada', 'observada', 'rechazada', 'vencida'];
    if (status && !allowed.includes(status)) {
      throw new BadRequestException('Estado de acreditación inválido.');
    }
    return this.memory.accreditations
      .map((item) => this.effective(item))
      .filter((item) => !status || item.status === status);
  }

  decision(actor: Profile, id: string, input: unknown): Accreditation {
    try {
      const item = this.memory.accreditations.find((entry) => entry.id === id);
      if (!item) throw new NotFoundException('Acreditación no encontrada.');
      const body = objectBody(input);
      const status = body.status;
      if (status !== 'aprobada' && status !== 'observada' && status !== 'rechazada') {
        throw new BadRequestException('La decisión no es válida.');
      }
      if (status === 'aprobada' && item.type === 'universitario' && !item.emailVerified) {
        throw new BadRequestException('Primero debe confirmarse el correo institucional.');
      }
      const note = body.note === undefined
        ? undefined
        : requiredText(body.note, 'La observación', 1, 1000);
      item.status = status;
      item.note = note;
      item.decidedAt = Date.now();
      item.validUntil = status === 'aprobada' ? Date.now() + 180 * 86400000 : undefined;
      this.audit.log(actor, 'acreditacion.decidir', id, 'ok', `${status}. ${note ?? ''}`);
      this.notifications.push(
        item.userId,
        'acreditacion',
        'Acreditación actualizada',
        `Tu acreditación fue ${status}.${note ? ` ${note}` : ''}`,
      );
      return this.effective(item);
    } catch (error) {
      this.audit.log(
        actor, 'acreditacion.decidir', id, 'error',
        error instanceof Error ? error.message : 'Solicitud inválida.',
      );
      throw error;
    }
  }
}
