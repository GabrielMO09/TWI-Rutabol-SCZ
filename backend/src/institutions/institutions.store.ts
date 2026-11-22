import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type InstitutionType = 'colegio' | 'universidad';

export interface Institution {
  id: string;
  type: InstitutionType;
  name: string;
  address: string | null;
  emailDomain: string | null;
  enabled: boolean;
}

type InstitutionFields = Omit<Institution, 'id'>;

interface InstitutionRow {
  id_institucion: string;
  tipo: 'secundaria' | 'universitaria';
  nombre: string;
  direccion: string | null;
  dominio_correo: string | null;
  estado: 'habilitada' | 'deshabilitada';
}

function fromRow(row: InstitutionRow): Institution {
  return {
    id: String(row.id_institucion),
    type: row.tipo === 'secundaria' ? 'colegio' : 'universidad',
    name: row.nombre,
    address: row.direccion,
    emailDomain: row.dominio_correo?.replace(/^@/, '').toLowerCase() || null,
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
    const result = await this.db.query<InstitutionRow>(
      `SELECT id_institucion,tipo,nombre,direccion,dominio_correo,estado
         FROM rutabol.institucion_educativa`,
    );
    this.rows.clear();
    for (const row of result.rows) {
      const item = fromRow(row);
      this.rows.set(item.id, item);
    }
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
      const item = { ...fields, id: id ?? String(++this.nextId) };
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
        ? await this.db.query<InstitutionRow>(
          `INSERT INTO rutabol.institucion_educativa(nombre,tipo,direccion,dominio_correo,estado)
           VALUES($1,$2,$3,$4,$5)
           RETURNING id_institucion,tipo,nombre,direccion,dominio_correo,estado`,
          params,
        )
        : await this.db.query<InstitutionRow>(
          `UPDATE rutabol.institucion_educativa i
              SET nombre=$1,tipo=$2,direccion=$3,dominio_correo=$4,estado=$5
            WHERE i.id_institucion=$6
              AND (i.tipo=$2 OR NOT EXISTS (
                SELECT 1 FROM rutabol.estudiante e WHERE e.id_institucion=i.id_institucion
              ))
           RETURNING id_institucion,tipo,nombre,direccion,dominio_correo,estado`,
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
