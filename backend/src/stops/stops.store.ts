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

type StopDescription = Pick<Stop, 'id' | 'name' | 'reference' | 'active'>;

interface StopRow {
  line: string;
  lat: number;
  lng: number;
  order: number;
  description: string;
}

const ROUTE_NAME = 'Paradas gestionadas';

export function stopDescription(stop: Stop): string {
  const { id, name, reference, active } = stop;
  return JSON.stringify({ id, name, reference, active });
}

@Injectable()
export class StopsStore {
  readonly stops = new Map<string, Stop>();
  private readonly saved = new Map<string, string>();

  constructor(@Optional() private readonly db?: DatabaseService) {}

  async hydrate() {
    if (!this.db) return;
    const { rows } = await this.db.query<StopRow>(
      `SELECT l.numero AS line, p.latitud::float8 AS lat, p.longitud::float8 AS lng,
              p.orden AS "order", p.descripcion AS description
         FROM rutabol.punto_ruta p
         JOIN rutabol.ruta r ON r.id_ruta = p.id_ruta
         JOIN rutabol.linea l ON l.id_linea = r.id_linea
        WHERE r.nombre = $1 AND r.sentido = $2 AND p.tipo = $3`,
      [ROUTE_NAME, 'circular', 'parada'],
    );
    const loaded = rows.map(({ description, ...point }): Stop => {
      const { id, name, reference, active } = JSON.parse(description) as StopDescription;
      return { id, name, reference, active, ...point };
    });

    this.stops.clear();
    this.saved.clear();
    for (const stop of loaded) this.stops.set(stop.id, stop);
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

    await db.tx(async (client) => {
      for (const { line, stops } of changes) {
        const route = await client.query<{ id: string }>(
          `INSERT INTO rutabol.ruta (id_linea, nombre, origen, destino, sentido)
           SELECT id_linea, $2, $3, $4, $5 FROM rutabol.linea WHERE numero = $1
           ON CONFLICT (id_linea, nombre, sentido) DO UPDATE SET nombre = EXCLUDED.nombre
           RETURNING id_ruta::text AS id`,
          [line, ROUTE_NAME, 'Inicio de línea', 'Final de línea', 'circular'],
        );
        const routeId = route.rows[0]?.id;
        if (!routeId) throw new Error(`No se encontró la línea ${line} al guardar sus paradas.`);

        await client.query(
          'DELETE FROM rutabol.punto_ruta WHERE id_ruta = $1 AND tipo = $2',
          [routeId, 'parada'],
        );
        if (stops.length) {
          await client.query(
            `INSERT INTO rutabol.punto_ruta (id_ruta, orden, latitud, longitud, tipo, descripcion)
             SELECT $1::bigint, p.orden, p.lat, p.lng, $2, p.descripcion
               FROM unnest($3::integer[], $4::numeric[], $5::numeric[], $6::text[])
                    AS p(orden, lat, lng, descripcion)`,
            [
              routeId, 'parada',
              stops.map((stop) => stop.order),
              stops.map((stop) => stop.lat),
              stops.map((stop) => stop.lng),
              stops.map(stopDescription),
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
