import { Injectable, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Stop {
  id: string;
  line: string;
  name: string;
  reference: string;
  lat: number;
  lng: number;
  order: number;
  active: boolean;
}

interface StopRow {
  id: string;
  line: string;
  name: string;
  reference: string;
  lat: number;
  lng: number;
  order: number;
  active: boolean;
}

@Injectable()
export class StopsStore {
  readonly stops = new Map<string, Stop>();
  private readonly saved = new Map<string, string>();

  constructor(@Optional() private readonly db?: DatabaseService) {}

  /** Las paradas viven en registro_transporte.parada. */
  async hydrate() {
    if (!this.db) return;
    const { rows } = await this.db.transport.query<StopRow>(
      `SELECT p.id_parada AS id, l.numero AS line, p.nombre AS name, p.referencia AS reference,
              p.latitud::float8 AS lat, p.longitud::float8 AS lng, p.orden AS "order", p.activa AS active
         FROM transporte.parada p
         JOIN transporte.linea l ON l.id_linea = p.id_linea`,
    );
    this.stops.clear();
    this.saved.clear();
    for (const stop of rows) this.stops.set(stop.id, stop);
    for (const [line, stops] of this.byLine()) this.saved.set(line, JSON.stringify(stops));
  }

  async run() {
    const db = this.db;
    if (!db) return;
    const groups = this.byLine();
    const lines = new Set([...groups.keys(), ...this.saved.keys()]);
    const changes = [...lines].flatMap((line) => {
      const stops = groups.get(line) ?? [];
      const print = JSON.stringify(stops);
      return print === this.saved.get(line) ? [] : [{ line, stops, print }];
    });
    if (!changes.length) return;

    await db.transport.tx(async (client) => {
      for (const { line, stops } of changes) {
        const found = await client.query<{ id: string }>(
          'SELECT id_linea::text AS id FROM transporte.linea WHERE numero = $1', [line],
        );
        const lineId = found.rows[0]?.id;
        if (!lineId) throw new Error(`No se encontró la línea ${line} al guardar sus paradas.`);

        await client.query('DELETE FROM transporte.parada WHERE id_linea = $1', [lineId]);
        if (stops.length) {
          await client.query(
            `INSERT INTO transporte.parada (id_parada, id_linea, nombre, referencia, latitud, longitud, orden, activa)
             SELECT p.id, $1::bigint, p.name, p.reference, p.lat, p.lng, p.ord, p.active
               FROM unnest($2::text[], $3::text[], $4::text[], $5::numeric[], $6::numeric[], $7::integer[], $8::boolean[])
                    AS p(id, name, reference, lat, lng, ord, active)`,
            [
              lineId,
              stops.map((stop) => stop.id),
              stops.map((stop) => stop.name),
              stops.map((stop) => stop.reference),
              stops.map((stop) => stop.lat),
              stops.map((stop) => stop.lng),
              stops.map((stop) => stop.order),
              stops.map((stop) => stop.active),
            ],
          );
        }
      }
    });

    for (const { line, stops, print } of changes) {
      if (stops.length) this.saved.set(line, print);
      else this.saved.delete(line);
    }
  }

  private byLine(): Map<string, Stop[]> {
    const groups = new Map<string, Stop[]>();
    for (const stop of this.stops.values()) {
      const group = groups.get(stop.line);
      if (group) group.push(stop);
      else groups.set(stop.line, [stop]);
    }
    for (const group of groups.values()) group.sort((a, b) => a.order - b.order);
    return groups;
  }
}
