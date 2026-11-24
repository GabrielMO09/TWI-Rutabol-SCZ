import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type InstitutionType = 'colegio' | 'universidad';

export interface Institution {
  id: string;
  type: InstitutionType;
  name: string;
  address: string | null;
  emailDomain: string | null;
  /** Otros dominios válidos de la misma universidad (ej. upds.net.bo). Solo lectura desde el registro. */
  extraDomains: string[];
  enabled: boolean;
}

type InstitutionFields = Omit<Institution, 'id' | 'extraDomains'>;

interface InstitutionRow {
  id_institucion: string;
  tipo: 'secundaria' | 'universitaria';
  nombre: string;
  direccion: string | null;
  dominio_correo: string | null;
  dominios_alternos: string[];
  estado: 'habilitada' | 'deshabilitada';
}

function fromRow(row: InstitutionRow): Institution {
  return {
    id: String(row.id_institucion),
    type: row.tipo === 'secundaria' ? 'colegio' : 'universidad',
    name: row.nombre,
    address: row.direccion,
    emailDomain: row.dominio_correo?.replace(/^@/, '').toLowerCase() || null,
    extraDomains: row.dominios_alternos.map((domain) => domain.replace(/^@/, '').toLowerCase()),
    enabled: row.estado === 'habilitada',
  };
}

@Injectable()
export class InstitutionsStore {
  private readonly rows = new Map<string, Institution>();
  private nextId = 0;

  constructor(@Optional() private readonly db?: DatabaseService) {}

  async hydrate(): Promise<void> {
    if (!this.db) return;
    const result = await this.db.academic.query<InstitutionRow>(
      `SELECT id_institucion,tipo,nombre,direccion,dominio_correo,dominios_alternos,estado
         FROM academico.institucion_educativa`,
    );
    this.rows.clear();
    for (const row of result.rows) {
      const item = fromRow(row);
      this.rows.set(item.id, item);
    }
  }

  /**
   * Consulta el registro académico: ¿el estudiante existe en esa institución y está vigente?
   * Rutabol no copia el registro; solo pregunta. Sin base configurada (pruebas) no hay registro que consultar.
   */
  async enrolled(
    institutionId: string, level: 'secundario' | 'universitario', key: string, institutionalCode?: string,
  ): Promise<boolean> {
    if (!this.db) return true;
    const result = level === 'universitario'
      ? await this.db.academic.query(
        `SELECT 1 FROM academico.estudiante
          WHERE id_institucion=$1 AND nivel='universitario' AND estado='vigente'
            AND lower(correo_institucional)=lower($2) AND lower(codigo_institucional)=lower($3)`,
        [institutionId, key, institutionalCode ?? ''],
      )
      : await this.db.academic.query(
        `SELECT 1 FROM academico.estudiante
          WHERE id_institucion=$1 AND nivel='secundario' AND estado='vigente' AND upper(rude)=upper($2)`,
        [institutionId, key],
      );
    return (result.rowCount ?? 0) > 0;
  }

  list(): Institution[] {
    return [...this.rows.values()].map((item) => ({ ...item }));
  }

  get(id: string): Institution | undefined {
    const item = this.rows.get(id);
    return item && { ...item };
  }

  async save(fields: InstitutionFields, id?: string): Promise<Institution> {
    const duplicate = () => new ConflictException('Ya existe una institución con ese nombre y tipo.');
    if ([...this.rows.values()].some((row) =>
      row.id !== id && row.type === fields.type && row.name === fields.name,
    )) {
      throw duplicate();
    }

    if (!this.db) {
      const item = { extraDomains: [], ...this.rows.get(id ?? ''), ...fields, id: id ?? String(++this.nextId) };
      this.rows.set(item.id, item);
      return { ...item };
    }

    const params = [
      fields.name,
      fields.type === 'colegio' ? 'secundaria' : 'universitaria',
      fields.address,
      fields.emailDomain,
      fields.enabled ? 'habilitada' : 'deshabilitada',
    ];
    try {
      const result = id === undefined
        ? await this.db.academic.query<InstitutionRow>(
          `INSERT INTO academico.institucion_educativa(nombre,tipo,direccion,dominio_correo,estado)
           VALUES($1,$2,$3,$4,$5)
           RETURNING id_institucion,tipo,nombre,direccion,dominio_correo,dominios_alternos,estado`,
          params,
        )
        : await this.db.academic.query<InstitutionRow>(
          `UPDATE academico.institucion_educativa i
              SET nombre=$1,tipo=$2,direccion=$3,dominio_correo=$4,estado=$5
            WHERE i.id_institucion=$6
              AND (i.tipo=$2 OR NOT EXISTS (
                SELECT 1 FROM academico.estudiante e WHERE e.id_institucion=i.id_institucion
              ))
           RETURNING id_institucion,tipo,nombre,direccion,dominio_correo,dominios_alternos,estado`,
          [...params, id],
        );
      const row = result.rows[0];
      if (!row) throw new ConflictException('La institución cambió o tiene estudiantes asociados.');
      const item = fromRow(row);
      this.rows.set(item.id, item);
      return { ...item };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw duplicate();
      }
      throw error;
    }
  }
}
