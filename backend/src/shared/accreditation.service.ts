import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstitutionsService } from '../institutions/institutions.service';
import { MemoryService } from '../micros/memory.service';
import type { Accreditation, Profile } from '../micros/models';
import { objectBody, requiredText, text } from '../micros/input';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { exposeDevCode, matchesCode, randomCode } from './security';

export const ACCOUNT_CONFLICT = 'Ya existe una cuenta con esos datos de identificación.';

export function registrationEmail(value: unknown): string {
  const email = requiredText(value, 'El correo electrónico', 5, 254).toLowerCase();
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(email) ||
    email.split('@')[0].length > 64) {
    throw new BadRequestException('Ingresa un correo electrónico válido.');
  }
  return email;
}

type RequestFields = Pick<Accreditation, 'type' | 'institution' | 'institutionId' | 'code' | 'institutionalCode'>;

@Injectable()
export class AccreditationService {
  constructor(
    private readonly memory: MemoryService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly institutions: InstitutionsService,
  ) {}

  prepareRequest(type: Accreditation['type'], input: unknown, exceptUserId?: string): RequestFields {
    const body = objectBody(input);
    const institution = this.institutions.resolve(
      body.institution, type === 'escolar' ? 'colegio' : 'universidad',
    );
    const code = type === 'universitario'
      ? registrationEmail(body.code) : requiredText(body.code, 'El código RUDE', 8, 20);
    if (type === 'escolar' && !/^[A-Za-z0-9]{8,20}$/.test(code)) {
      throw new BadRequestException('El código RUDE debe tener entre 8 y 20 caracteres alfanuméricos.');
    }
    if (type === 'universitario' &&
      (!institution.emailDomain ||
        ![institution.emailDomain, ...institution.extraDomains].includes(code.split('@')[1]))) {
      throw new BadRequestException(institution.emailDomain
        ? `Usa tu correo institucional @${institution.emailDomain}.`
        : 'La universidad seleccionada no tiene un dominio de correo configurado.');
    }
    const institutionalCode = type === 'universitario'
      ? requiredText(body.institutionalCode, 'El código institucional', 1, 70) : undefined;

    const normalized = code.toLowerCase();
    if (
      [...this.memory.users.values()].some(({ profile }) =>
        profile.userId !== exceptUserId &&
        (profile.code?.toLowerCase() === normalized ||
          profile.userId.toLowerCase() === normalized ||
          profile.email?.toLowerCase() === normalized),
      ) ||
      this.memory.accreditations.some((item) =>
        item.userId !== exceptUserId &&
        (item.code.toLowerCase() === normalized ||
          (institutionalCode !== undefined &&
            item.institutionId === institution.id &&
            (item.institutionalCode ?? item.code) === institutionalCode)),
      )
    ) {
      throw new ConflictException(ACCOUNT_CONFLICT);
    }

    return {
      type, institution: institution.name, institutionId: institution.id, code, institutionalCode,
    };
  }

  /** El estudiante debe existir y estar vigente en el registro académico de su institución. */
  async verifyEnrollment(fields: RequestFields): Promise<void> {
    const level = fields.type === 'escolar' ? 'secundario' : 'universitario';
    const key = fields.type === 'escolar' ? fields.code : fields.code.toLowerCase();
    if (!fields.institutionId ||
      !await this.institutions.enrolled(fields.institutionId, level, key, fields.institutionalCode)) {
      throw new BadRequestException(
        'No encontramos tus datos vigentes en el registro académico de la institución. Revisa tu código y vuelve a intentar.',
      );
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

  /** Valida la solicitud de un usuario existente (sin crearla ni consultar el registro académico). */
  prepare(userId: string, input: unknown): RequestFields {
    const user = this.memory.users.get(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const type = user.profile.category;
    if (type !== 'escolar' && type !== 'universitario') {
      throw new BadRequestException('Tu categoría no requiere acreditación.');
    }
    return this.prepareRequest(type, input, userId);
  }

  request(userId: string, input: unknown) {
    return this.startRequest(userId, this.prepare(userId, input));
  }

  startRequest(userId: string, fields: RequestFields): {
    accreditation: Accreditation;
    devCode?: string;
  } {
    const accreditation: Accreditation = {
      ...fields,
      id: this.memory.nextId('AC'),
      userId,
      status: 'pendiente',
      emailVerified: fields.type === 'escolar',
      requestedAt: Date.now(),
    };
    const index = this.memory.accreditations.findIndex((item) => item.userId === userId);
    if (index >= 0) this.memory.accreditations.splice(index, 1, accreditation);
    else this.memory.accreditations.push(accreditation);
    this.memory.emailCodes.delete(userId);
    let devCode: string | undefined;
    if (fields.type === 'universitario') {
      devCode = randomCode();
      this.memory.emailCodes.set(userId, {
        code: devCode,
        expiresAt: Date.now() + 15 * 60000,
        attempts: 0,
      });
    }
    this.memory.events.emit();
    return { accreditation: { ...accreditation }, ...(devCode && exposeDevCode() ? { devCode } : {}) };
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
