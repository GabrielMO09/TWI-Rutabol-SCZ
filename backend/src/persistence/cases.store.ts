import type { DatabaseService } from '../database/database.service';
import type { MemoryService } from '../micros/memory.service';
import type { Accreditation, Claim } from '../micros/models';

const CLAIM_TO_DB: Record<Claim['status'], string> = {
  recibido: 'recibido', 'en-revision': 'en_revision', resuelto: 'resuelto', rechazado: 'rechazado',
};
const CLAIM_FROM_DB = Object.fromEntries(
  Object.entries(CLAIM_TO_DB).map(([key, value]) => [value, key]),
) as Record<string, Claim['status']>;

/** Acreditación estudiantil y reclamos. */
export class CasesStore {
  private readonly accreditations = new Map<string, string>();
  private readonly claims = new Map<string, string>();
  private readonly claimHistory = new Map<string, number>();

  constructor(private readonly db: DatabaseService, private readonly memory: MemoryService) {}

  async hydrate() {
    const rows = await this.db.query<{
      ref_app: string; identificador: string; nivel: 'secundario' | 'universitario'; institucion: string;
      rude: string | null; correo_institucional: string | null; estado: Accreditation['status'];
      correo_verificado: boolean; vigencia_hasta: Date | null; nota: string | null;
      fecha_solicitud: Date; fecha_resolucion: Date | null;
      id_institucion: string; codigo_institucional: string | null;
    }>(
      `SELECT DISTINCT ON (e.id_estudiante) s.ref_app,us.identificador,e.nivel,i.nombre AS institucion,e.rude,
              e.id_institucion,e.codigo_institucional,e.correo_institucional,s.estado,s.correo_verificado,s.vigencia_hasta,s.nota,
              s.fecha_solicitud,s.fecha_resolucion
         FROM rutabol.solicitud_validacion s
         JOIN rutabol.estudiante e ON e.id_estudiante=s.id_estudiante
         JOIN rutabol.usuario us ON us.id_usuario=e.id_usuario
         JOIN rutabol.institucion_educativa i ON i.id_institucion=e.id_institucion
        ORDER BY e.id_estudiante,s.fecha_solicitud DESC,s.id_solicitud DESC`,
    );
    for (const row of rows.rows) {
      this.memory.adopt(row.ref_app);
      // Lo guardado manda sobre los datos de demostración del arranque.
      const old = this.memory.accreditations.findIndex((item) => item.userId === row.identificador);
      if (old >= 0) this.memory.accreditations.splice(old, 1);
      const item: Accreditation = {
        id: row.ref_app, userId: row.identificador,
        type: row.nivel === 'secundario' ? 'escolar' : 'universitario', institution: row.institucion,
        institutionId: String(row.id_institucion),
        ...(row.codigo_institucional ? { institutionalCode: row.codigo_institucional } : {}),
        code: row.rude ?? row.correo_institucional ?? '', status: row.estado,
        emailVerified: row.correo_verificado, requestedAt: row.fecha_solicitud.getTime(),
        ...(row.vigencia_hasta ? { validUntil: row.vigencia_hasta.getTime() } : {}),
        ...(row.nota ? { note: row.nota } : {}),
        ...(row.fecha_resolucion ? { decidedAt: row.fecha_resolucion.getTime() } : {}),
      };
      this.memory.accreditations.push(item);
      this.accreditations.set(item.id, this.accreditationPrint(item));
    }

    const claims = await this.db.query<{
      ref_app: string; identificador: string; nombre_completo: string; linea: string; numero_interno: string;
      fecha_hecho: Date | null; descripcion: string; evidencia: string | null; ticket: string | null;
      estado: string; respuesta: string | null; monto: number | null; fecha: Date; actualizado_en: Date;
      historial: { at: number; status: string; by: string | null; note: string }[];
    }>(
      `SELECT r.ref_app,us.identificador,us.nombre_completo,l.numero AS linea,u.numero_interno,r.fecha_hecho,
              r.descripcion,r.evidencia,tp.ref_app AS ticket,r.estado,r.respuesta,r.monto_reembolso::float8 AS monto,
              r.fecha,r.actualizado_en,
              coalesce((SELECT json_agg(json_build_object(
                          'at',(extract(epoch from sg.fecha)*1000)::float8,'status',sg.estado_nuevo,
                          'by',su.identificador,'note',sg.accion) ORDER BY sg.fecha,sg.id_seguimiento)
                          FROM rutabol.seguimiento_reclamo sg
                          LEFT JOIN rutabol.usuario su ON su.id_usuario=sg.id_administrador
                         WHERE sg.id_reclamo=r.id_reclamo),'[]') AS historial
         FROM rutabol.reclamo r
         JOIN rutabol.usuario us ON us.id_usuario=r.id_usuario
         JOIN rutabol.unidad_transporte u ON u.id_unidad=r.id_unidad
         JOIN rutabol.linea l ON l.id_linea=u.id_linea
         LEFT JOIN rutabol.transaccion_pago tp ON tp.id_transaccion=r.id_transaccion
        ORDER BY r.fecha,r.id_reclamo`,
    );
    for (const row of claims.rows) {
      this.memory.adopt(row.ref_app);
      const history = row.historial.map((entry) => ({
        at: entry.at, status: CLAIM_FROM_DB[entry.status] ?? 'recibido', by: entry.by ?? 'desconocido',
        ...(entry.note ? { note: entry.note } : {}),
      }));
      const claim: Claim = {
        id: row.ref_app, userId: row.identificador, name: row.nombre_completo, line: row.linea,
        internal: row.numero_interno, tripAt: row.fecha_hecho?.getTime() ?? row.fecha.getTime(),
        description: row.descripcion, status: CLAIM_FROM_DB[row.estado] ?? 'recibido',
        at: row.fecha.getTime(), updatedAt: row.actualizado_en.getTime(), history,
        ...(row.evidencia ? { evidence: row.evidencia } : {}),
        ...(row.ticket ? { ticketId: row.ticket } : {}),
        ...(row.respuesta ? { response: row.respuesta } : {}),
        ...(row.monto ? { refund: row.monto } : {}),
      };
      this.memory.claims.push(claim);
      this.claims.set(claim.id, this.claimPrint(claim));
      this.claimHistory.set(claim.id, history.length);
    }
  }

  private accreditationPrint = (item: Accreditation) =>
    JSON.stringify([item.status, item.emailVerified, item.validUntil ?? null, item.note ?? null, item.decidedAt ?? null]);
  private claimPrint = (claim: Claim) =>
    JSON.stringify([claim.status, claim.response ?? null, claim.refund ?? 0, claim.history.length]);

  async runAccreditations() {
    const items = this.memory.accreditations.filter(
      (item) => this.accreditations.get(item.id) !== this.accreditationPrint(item),
    );
    if (!items.length) return;
    await this.db.tx(async (client) => {
      for (const item of items) {
        // Solo una solicitud nueva escribe al estudiante: una decisión o confirmación posterior
        // no vuelve a validar contra un dominio que pudo cambiar desde el alta.
        if (!this.accreditations.has(item.id)) {
          const level = item.type === 'escolar' ? 'secundario' : 'universitario';
          const kind = item.type === 'escolar' ? 'secundaria' : 'universitaria';
          const domain = item.type === 'universitario' ? item.code.split('@')[1] ?? null : null;
          let institution = item.institutionId;
          if (institution === undefined) {
            // Compatibilidad con datos de demostración y solicitudes anteriores al catálogo.
            const found = await client.query<{ id_institucion: string }>(
              `SELECT id_institucion FROM rutabol.institucion_educativa
                WHERE tipo=$1 AND strpos(lower(nombre),lower($2))>0
                ORDER BY (lower(nombre)=lower($2)) DESC,id_institucion LIMIT 1`,
              [kind, item.institution],
            );
            institution = found.rows[0]?.id_institucion ?? (await client.query<{ id_institucion: string }>(
              `INSERT INTO rutabol.institucion_educativa(nombre,tipo,dominio_correo,estado)
               VALUES($1,$2,$3,'deshabilitada')
               ON CONFLICT (nombre,tipo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_institucion`,
              [item.institution.slice(0, 180), kind, domain],
            )).rows[0].id_institucion;
          }
          await client.query(
            `INSERT INTO rutabol.estudiante(id_usuario,id_institucion,nivel,rude,codigo_institucional,correo_institucional)
             SELECT id_usuario,$2,$3,$4,$5,$6 FROM rutabol.usuario WHERE identificador=$1
             ON CONFLICT (id_usuario) DO UPDATE SET id_institucion=EXCLUDED.id_institucion,nivel=EXCLUDED.nivel,
               rude=EXCLUDED.rude,codigo_institucional=EXCLUDED.codigo_institucional,
               correo_institucional=EXCLUDED.correo_institucional`,
            [
              item.userId, institution, level, item.type === 'escolar' ? item.code : null,
              item.type === 'universitario' ? item.institutionalCode ?? item.code : null,
              item.type === 'universitario' ? item.code : null,
            ],
          );
        }
        // Una nueva solicitud reemplaza a la anterior: se cierra la que siga abierta.
        await client.query(
          `UPDATE rutabol.solicitud_validacion s
              SET estado=CASE WHEN s.estado='aprobada' THEN 'revocada' ELSE 'vencida' END,
                  fecha_resolucion=coalesce(s.fecha_resolucion,now())
             FROM rutabol.estudiante e JOIN rutabol.usuario u ON u.id_usuario=e.id_usuario
            WHERE s.id_estudiante=e.id_estudiante AND u.identificador=$1 AND s.ref_app<>$2
              AND s.estado IN ('pendiente','aprobada')`,
          [item.userId, item.id],
        );
        await client.query(
          `INSERT INTO rutabol.solicitud_validacion(ref_app,id_estudiante,fecha_solicitud,estado,correo_verificado,
                                                    fecha_resolucion,nota,vigencia_hasta)
           SELECT $2,e.id_estudiante,to_timestamp($3/1000.0),$4,$5,to_timestamp($6/1000.0),$7,to_timestamp($8/1000.0)
             FROM rutabol.estudiante e JOIN rutabol.usuario u ON u.id_usuario=e.id_usuario WHERE u.identificador=$1
           ON CONFLICT (ref_app) DO UPDATE SET estado=EXCLUDED.estado,correo_verificado=EXCLUDED.correo_verificado,
             fecha_resolucion=EXCLUDED.fecha_resolucion,nota=EXCLUDED.nota,vigencia_hasta=EXCLUDED.vigencia_hasta`,
          [
            item.userId, item.id, item.requestedAt, item.status, item.emailVerified,
            item.decidedAt ?? null, item.note ?? null, item.validUntil ?? null,
          ],
        );
      }
    });
    for (const item of items) this.accreditations.set(item.id, this.accreditationPrint(item));
  }

  async runClaims() {
    const claims = this.memory.claims.filter((item) => this.claims.get(item.id) !== this.claimPrint(item));
    if (!claims.length) return;
    await this.db.tx(async (client) => {
      for (const claim of claims) {
        await client.query(
          `INSERT INTO rutabol.reclamo(ref_app,id_usuario,id_linea,id_unidad,id_transaccion,descripcion,evidencia,
                                       fecha_hecho,fecha,actualizado_en,estado,respuesta,monto_reembolso)
           SELECT $1,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$2),l.id_linea,u.id_unidad,
                  (SELECT id_transaccion FROM rutabol.transaccion_pago WHERE ref_app=$3),$4,$5,
                  to_timestamp($6/1000.0),to_timestamp($7/1000.0),to_timestamp($8/1000.0),$9,$10,$11
             FROM rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea
            WHERE l.numero=$12 AND u.numero_interno=$13
           ON CONFLICT (ref_app) DO UPDATE SET estado=EXCLUDED.estado,respuesta=EXCLUDED.respuesta,
             monto_reembolso=EXCLUDED.monto_reembolso,actualizado_en=EXCLUDED.actualizado_en`,
          [
            claim.id, claim.userId, claim.ticketId ?? null, claim.description, claim.evidence ?? null,
            claim.tripAt, claim.at, claim.updatedAt, CLAIM_TO_DB[claim.status], claim.response ?? null,
            claim.refund ?? null, claim.line, claim.internal,
          ],
        );
        for (const entry of claim.history.slice(this.claimHistory.get(claim.id) ?? 0)) {
          await client.query(
            `INSERT INTO rutabol.seguimiento_reclamo(id_reclamo,id_administrador,estado_nuevo,accion,fecha)
             SELECT r.id_reclamo,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$2),$3,$4,
                    to_timestamp($5/1000.0)
               FROM rutabol.reclamo r WHERE r.ref_app=$1`,
            [claim.id, entry.by, CLAIM_TO_DB[entry.status], entry.note ?? '', entry.at],
          );
        }
      }
    });
    for (const claim of claims) {
      this.claims.set(claim.id, this.claimPrint(claim));
      this.claimHistory.set(claim.id, claim.history.length);
    }
  }
}
