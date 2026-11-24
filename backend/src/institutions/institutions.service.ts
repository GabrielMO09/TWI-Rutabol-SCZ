import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { objectBody, requiredText, text } from '../micros/input';
import { MemoryService } from '../micros/memory.service';
import type { Profile } from '../micros/models';
import { booleanValue } from '../ops/validation';
import { AuditService } from '../shared/audit.service';
import { InstitutionsStore } from './institutions.store';
import type { Institution, InstitutionType } from './institutions.store';

function institutionType(value: unknown): InstitutionType {
  if (value === 'colegio' || value === 'universidad') return value;
  throw new BadRequestException('Selecciona colegio o universidad.');
}

function emailDomain(value: unknown): string | null {
  if (value === null) return null;
  const domain = requiredText(value, 'El dominio de correo', 3, 254)
    .replace(/^@/, '').toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new BadRequestException('Ingresa un dominio de correo válido.');
  }
  return domain;
}

@Injectable()
export class InstitutionsService {
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: InstitutionsStore,
    private readonly audit: AuditService,
    private readonly memory: MemoryService,
  ) {}

  list(onlyEnabled = false): Institution[] {
    return this.store.list()
      .filter((item) => !onlyEnabled || item.enabled)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  resolve(value: unknown, type: InstitutionType): Institution {
    const key = requiredText(value, 'La institución', 1, 180);
    const byId = this.store.get(key);
    const item = byId ?? this.store.list().find((row) => row.type === type && row.name === key);
    if (!item || !item.enabled || item.type !== type) {
      throw new BadRequestException('Selecciona una institución habilitada para tu categoría.');
    }
    return item;
  }

  enrolled(...args: Parameters<InstitutionsStore['enrolled']>): Promise<boolean> {
    return this.store.enrolled(...args);
  }

  create(actor: Profile, input: unknown): Promise<Institution> {
    return this.mutate(actor, input, false);
  }

  update(actor: Profile, input: unknown): Promise<Institution> {
    return this.mutate(actor, input, true);
  }

  private mutate(actor: Profile, input: unknown, editing: boolean): Promise<Institution> {
    const work = this.pending.then(async () => {
      const body = objectBody(input);
      const id = editing ? requiredText(body.id, 'El ID de la institución', 1, 19) : undefined;
      const current = id === undefined ? undefined : this.store.get(id);
      if (editing && !current) throw new NotFoundException('Institución no encontrada.');

      const type = body.type === undefined && current ? current.type : institutionType(body.type);
      const name = body.name === undefined && current
        ? current.name : requiredText(body.name, 'El nombre de la institución', 2, 180);
      const address = body.address === undefined
        ? current?.address ?? null
        : body.address === null || (typeof body.address === 'string' && !text(body.address))
          ? null : requiredText(body.address, 'La dirección', 1, 1000);
      const domain = body.emailDomain === undefined
        ? current?.emailDomain ?? null : emailDomain(body.emailDomain);
      const enabled = body.enabled === undefined
        ? current?.enabled ?? true : booleanValue(body.enabled);

      if (type === 'universidad' && enabled && !domain) {
        throw new BadRequestException('Una universidad habilitada requiere un dominio de correo.');
      }
      if (current && current.type !== type &&
        this.memory.accreditations.some((item) => item.institutionId === current.id)) {
        throw new ConflictException('La institución tiene estudiantes asociados.');
      }

      const saved = await this.store.save({ type, name, address, emailDomain: domain, enabled }, id);
      this.audit.log(
        actor, editing ? 'institucion.editar' : 'institucion.crear', saved.id, 'ok',
        `${saved.name} (${saved.enabled ? 'habilitada' : 'deshabilitada'}).`,
      );
      return saved;
    });
    this.pending = work.catch(() => undefined);
    return work;
  }
}
