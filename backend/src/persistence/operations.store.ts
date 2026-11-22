import type { DatabaseService } from '../database/database.service';
import type { MemoryService } from '../micros/memory.service';
import type {
  Alert, AuditEntry, Incident, Notification, OccupancyEvent, Position, Role,
} from '../micros/models';

const TYPE_TO_DB: Record<Incident['type'], string> = {
  accidente: 'accidente', 'falla-mecanica': 'falla_mecanica', bloqueo: 'bloqueo',
  averia: 'averia', otro: 'otra',
};
const STATUS_TO_DB: Record<Incident['status'], string> = {
  reportado: 'reportada', 'en-atencion': 'en_atencion', resuelto: 'resuelta',
};
const invert = <T extends string>(map: Record<T, string>) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<string, T>;
const TYPE_FROM_DB = invert(TYPE_TO_DB);
const STATUS_FROM_DB = invert(STATUS_TO_DB);

interface IncidentRow {
  ref_app: string; linea: string; numero_interno: string; tipo: string; severidad: Incident['severity'];
  descripcion: string; lat: number | null; lng: number | null; fecha: Date; estado: string;
  historial: { at: number; status: string; by: string | null }[];
}

/** Auditoría, notificaciones, incidentes, alertas y eventos de ocupación (los de la simulación no se guardan). */
export class OperationsStore {
  private readonly audit = new Set<string>();
  private readonly notifications = new Map<string, string>();
  private readonly incidents = new Map<string, string>();
  private readonly alerts = new Set<string>();
  private readonly occupancy = new Set<string>();

  constructor(private readonly db: DatabaseService, private readonly memory: MemoryService) {}

  async hydrate() {
    const audit = await this.db.query<{
      ref_app: string; actor: string | null; rol_actor: Role | null; accion: string; objetivo: string | null;
      resultado: AuditEntry['result']; detalle: { detail?: string; actorId?: string } | null; fecha: Date;
    }>(
      `SELECT * FROM (
         SELECT a.ref_app,u.identificador AS actor,a.rol_actor,a.accion,a.objetivo,a.resultado,a.detalle,a.fecha
           FROM rutabol.auditoria a LEFT JOIN rutabol.usuario u ON u.id_usuario=a.id_usuario
          ORDER BY a.fecha DESC,a.id_auditoria DESC LIMIT 2000) recientes
        ORDER BY fecha,ref_app`,
    );
    for (const row of audit.rows) {
      this.memory.adopt(row.ref_app);
      this.audit.add(row.ref_app);
      this.memory.audit.push({
        id: row.ref_app, at: row.fecha.getTime(), actorId: row.detalle?.actorId ?? row.actor ?? 'desconocido',
        actorRole: row.rol_actor ?? 'pasajero', action: row.accion, target: row.objetivo ?? '',
        result: row.resultado, detail: row.detalle?.detail ?? '',
      });
    }

    const notes = await this.db.query<{
      ref_app: string; identificador: string; tipo: string; titulo: string; mensaje: string;
      fecha: Date; leida: boolean;
    }>(
      `SELECT n.ref_app,u.identificador,n.tipo,n.titulo,n.mensaje,n.fecha,n.leida
         FROM rutabol.notificacion n JOIN rutabol.usuario u ON u.id_usuario=n.id_usuario
        ORDER BY n.fecha,n.id_notificacion`,
    );
    for (const row of notes.rows) {
      this.memory.adopt(row.ref_app);
      const list = this.memory.notifications.get(row.identificador) ?? [];
      const note: Notification = {
        id: row.ref_app, at: row.fecha.getTime(), kind: row.tipo, title: row.titulo,
        body: row.mensaje, read: row.leida,
      };
      list.push(note);
      this.memory.notifications.set(row.identificador, list);
      this.notifications.set(note.id, String(note.read));
    }

    const incidents = await this.db.query<IncidentRow>(
      `SELECT i.ref_app,l.numero AS linea,u.numero_interno,i.tipo,i.severidad,i.descripcion,
              i.latitud::float8 AS lat,i.longitud::float8 AS lng,i.fecha,i.estado,
              coalesce((SELECT json_agg(json_build_object(
                          'at',(extract(epoch from h.fecha)*1000)::float8,'status',h.estado,'by',hu.identificador)
                          ORDER BY h.fecha,h.id_historial)
                          FROM rutabol.historial_incidencia h
                          LEFT JOIN rutabol.usuario hu ON hu.id_usuario=h.id_usuario
                         WHERE h.id_incidencia=i.id_incidencia),'[]') AS historial
         FROM rutabol.incidencia i
         JOIN rutabol.unidad_transporte u ON u.id_unidad=i.id_unidad
         JOIN rutabol.linea l ON l.id_linea=u.id_linea
        ORDER BY i.fecha,i.id_incidencia`,
    );
    for (const row of incidents.rows) {
      this.memory.adopt(row.ref_app);
      const history = row.historial.map((item) => ({
        at: item.at, status: STATUS_FROM_DB[item.status] ?? 'reportado', by: item.by ?? 'desconocido',
      }));
      const incident: Incident = {
        id: row.ref_app, busId: `${row.linea}-${row.numero_interno}`, line: row.linea,
        internal: row.numero_interno, type: TYPE_FROM_DB[row.tipo] ?? 'otro',
        description: row.descripcion, severity: row.severidad,
        status: STATUS_FROM_DB[row.estado] ?? 'reportado', at: row.fecha.getTime(),
        updatedAt: history.at(-1)?.at ?? row.fecha.getTime(), history,
        ...(row.lat !== null && row.lng !== null ? { pos: [row.lat, row.lng] as Position } : {}),
      };
      this.memory.incidents.push(incident);
      this.incidents.set(incident.id, this.incidentPrint(incident));
    }

    const alerts = await this.db.query<{
      ref_app: string; linea: string; numero_interno: string; tipo: Alert['kind']; mensaje: string; fecha: Date;
    }>(
      `SELECT a.ref_app,l.numero AS linea,u.numero_interno,a.tipo,a.mensaje,a.fecha
         FROM rutabol.alerta a JOIN rutabol.unidad_transporte u ON u.id_unidad=a.id_unidad
         JOIN rutabol.linea l ON l.id_linea=u.id_linea
        WHERE a.atendida_en IS NULL ORDER BY a.fecha`,
    );
    for (const row of alerts.rows) {
      this.memory.adopt(row.ref_app);
      this.memory.alerts.push({
        id: row.ref_app, busId: `${row.linea}-${row.numero_interno}`, at: row.fecha.getTime(),
        kind: row.tipo, message: row.mensaje,
      });
      this.alerts.add(row.ref_app);
    }

    const events = await this.db.query<{
      ref_app: string; linea: string; numero_interno: string; tipo: OccupancyEvent['kind'];
      ocupacion_anterior: number; ocupacion_resultante: number; motivo: string | null;
      actor: string | null; fecha_hora: Date;
    }>(
      `SELECT * FROM (
         SELECT o.ref_app,l.numero AS linea,u.numero_interno,o.tipo,o.ocupacion_anterior,o.ocupacion_resultante,
                o.motivo,us.identificador AS actor,o.fecha_hora
           FROM rutabol.registro_ocupacion o
           JOIN rutabol.unidad_transporte u ON u.id_unidad=o.id_unidad
           JOIN rutabol.linea l ON l.id_linea=u.id_linea
           LEFT JOIN rutabol.usuario us ON us.id_usuario=o.id_usuario
          ORDER BY o.fecha_hora DESC,o.id_ocupacion DESC LIMIT 1000) recientes
        ORDER BY fecha_hora,ref_app`,
    );
    for (const row of events.rows) {
      this.memory.adopt(row.ref_app);
      this.memory.occupancyEvents.push({
        id: row.ref_app, at: row.fecha_hora.getTime(), busId: `${row.linea}-${row.numero_interno}`,
        kind: row.tipo, from: row.ocupacion_anterior, to: row.ocupacion_resultante,
        by: row.actor ?? 'desconocido', ...(row.motivo ? { reason: row.motivo } : {}),
      });
      this.occupancy.add(row.ref_app);
    }
  }

  private incidentPrint = (incident: Incident) =>
    JSON.stringify([incident.status, incident.severity, incident.history.length]);

  async run() {
    const audit = this.memory.audit.filter((entry) => !this.audit.has(entry.id));
    const notes: [string, Notification][] = [];
    for (const [userId, list] of this.memory.notifications) {
      for (const note of list) {
        if (this.notifications.get(note.id) !== String(note.read)) notes.push([userId, note]);
      }
    }
    const incidents = this.memory.incidents.filter(
      (incident) => this.incidents.get(incident.id) !== this.incidentPrint(incident),
    );
    // La alerta de aforo se recalcula sola desde la ocupación: no se guarda.
    const alerts = this.memory.alerts.filter((alert) => alert.kind !== 'aforo' && !this.alerts.has(alert.id));
    const live = new Set(this.memory.alerts.map((alert) => alert.id));
    const closed = [...this.alerts].filter((id) => !live.has(id));
    const events = this.memory.occupancyEvents.filter(
      (event) => event.by !== 'simulador' && !this.occupancy.has(event.id),
    );
    if (![audit, notes, incidents, alerts, closed, events].some((list) => list.length)) return;
    await this.db.tx(async (client) => {
      for (const entry of audit) {
        await client.query(
          `INSERT INTO rutabol.auditoria(ref_app,id_usuario,rol_actor,entidad,accion,objetivo,resultado,detalle,fecha)
           VALUES($1,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$2),$3,$4,$5,$6,$7,$8::jsonb,
                  to_timestamp($9/1000.0)) ON CONFLICT (ref_app) DO NOTHING`,
          [
            entry.id, entry.actorId, entry.actorRole, entry.action.split('.')[0].slice(0, 100),
            entry.action.slice(0, 50), entry.target, entry.result,
            JSON.stringify({ detail: entry.detail, actorId: entry.actorId }), entry.at,
          ],
        );
      }
      for (const [userId, note] of notes) {
        await client.query(
          `INSERT INTO rutabol.notificacion(ref_app,id_usuario,tipo,titulo,mensaje,fecha,leida)
           SELECT $1,id_usuario,$3,$4,$5,to_timestamp($6/1000.0),$7 FROM rutabol.usuario WHERE identificador=$2
           ON CONFLICT (ref_app) DO UPDATE SET leida=EXCLUDED.leida`,
          [note.id, userId, note.kind.slice(0, 50), note.title.slice(0, 160), note.body, note.at, note.read],
        );
      }
      for (const incident of incidents) {
        const [first] = incident.history;
        await client.query(
          `INSERT INTO rutabol.incidencia(ref_app,id_unidad,id_reportante,tipo,severidad,descripcion,latitud,longitud,fecha,estado)
           SELECT $1,u.id_unidad,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$2),$3,$4,$5,$6,$7,
                  to_timestamp($8/1000.0),$9
             FROM rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea
            WHERE l.numero=$10 AND u.numero_interno=$11
           ON CONFLICT (ref_app) DO UPDATE SET estado=EXCLUDED.estado,severidad=EXCLUDED.severidad`,
          [
            incident.id, first?.by ?? null, TYPE_TO_DB[incident.type], incident.severity,
            incident.description, incident.pos?.[0] ?? null, incident.pos?.[1] ?? null, incident.at,
            STATUS_TO_DB[incident.status], incident.line, incident.internal,
          ],
        );
        // El historial es solo de adición: se insertan las entradas que aún no están.
        const saved = await client.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM rutabol.historial_incidencia h
             JOIN rutabol.incidencia i ON i.id_incidencia=h.id_incidencia WHERE i.ref_app=$1`,
          [incident.id],
        );
        for (const item of incident.history.slice(saved.rows[0].n)) {
          await client.query(
            `INSERT INTO rutabol.historial_incidencia(id_incidencia,estado,id_usuario,fecha)
             SELECT i.id_incidencia,$2,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$3),
                    to_timestamp($4/1000.0)
               FROM rutabol.incidencia i WHERE i.ref_app=$1`,
            [incident.id, STATUS_TO_DB[item.status], item.by, item.at],
          );
        }
      }
      for (const alert of alerts) {
        await client.query(
          `INSERT INTO rutabol.alerta(ref_app,id_unidad,tipo,mensaje,fecha)
           SELECT $1,u.id_unidad,$2,$3,to_timestamp($4/1000.0)
             FROM rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea
            WHERE (l.numero||'-'||u.numero_interno)=$5 ON CONFLICT (ref_app) DO NOTHING`,
          [alert.id, alert.kind, alert.message, alert.at, alert.busId],
        );
      }
      for (const id of closed) {
        await client.query(
          'UPDATE rutabol.alerta SET atendida_en=now() WHERE ref_app=$1 AND atendida_en IS NULL', [id],
        );
      }
      for (const event of events) {
        await client.query(
          `INSERT INTO rutabol.registro_ocupacion(ref_app,id_unidad,tipo,ocupacion_anterior,ocupacion_resultante,
                                                  motivo,id_usuario,fecha_hora)
           SELECT $1,u.id_unidad,$3,$4,$5,$6,(SELECT id_usuario FROM rutabol.usuario WHERE identificador=$7),
                  to_timestamp($8/1000.0)
             FROM rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea
            WHERE (l.numero||'-'||u.numero_interno)=$2 ON CONFLICT (ref_app) DO NOTHING`,
          [event.id, event.busId, event.kind, event.from, event.to, event.reason ?? null, event.by, event.at],
        );
      }
    });
    for (const entry of audit) this.audit.add(entry.id);
    for (const [, note] of notes) this.notifications.set(note.id, String(note.read));
    for (const incident of incidents) this.incidents.set(incident.id, this.incidentPrint(incident));
    for (const alert of alerts) this.alerts.add(alert.id);
    for (const id of closed) this.alerts.delete(id);
    for (const event of events) this.occupancy.add(event.id);
  }
}
