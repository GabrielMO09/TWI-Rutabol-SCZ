import type { DatabaseService } from '../database/database.service';
import type { MemoryService } from '../micros/memory.service';
import type { Bus, Fares, Line, Position } from '../micros/models';
import { interpolate } from '../shared/geo';

interface LineRow { numero: string; nombre: string; estado: string; puntos: Position[] }
interface BusRow {
  linea: string; numero_interno: string; placa: string; capacidad_maxima: number;
  estado: string; estado_operativo: Bus['status'];
}
interface FareRow { nombre: keyof Omit<Fares, 'validFrom'>; monto: number; vigente_desde: Date }

/** Líneas, unidades, conductores y tarifas. Mismo patrón que PersistenceService: carga y guarda diferencias. */
export class CatalogStore {
  private readonly lines = new Map<string, string>();
  private readonly buses = new Map<string, string>();
  private readonly drivers = new Map<string, string>();
  private savedFares = 0;

  constructor(private readonly db: DatabaseService, private readonly memory: MemoryService) {}

  async hydrate() {
    const lines = await this.db.query<LineRow>(
      `SELECT l.numero,l.nombre,l.estado,
              coalesce(json_agg(json_build_array(p.latitud::float8,p.longitud::float8) ORDER BY p.orden)
                       FILTER (WHERE p.id_punto IS NOT NULL),'[]') AS puntos
         FROM rutabol.linea l
         LEFT JOIN rutabol.ruta r ON r.id_linea=l.id_linea
               AND NOT (r.nombre='Paradas gestionadas' AND r.sentido='circular')
         LEFT JOIN rutabol.punto_ruta p ON p.id_ruta=r.id_ruta
        GROUP BY l.id_linea`,
    );
    for (const row of lines.rows) {
      const existing = this.memory.lines.find((line) => line.id === row.numero);
      const values = { name: row.nombre, active: row.estado === 'activa', waypoints: row.puntos };
      if (existing) Object.assign(existing, values);
      else this.memory.lines.push({ id: row.numero, ...values });
      this.lines.set(row.numero, this.linePrint(this.memory.lines.find((line) => line.id === row.numero)!));
    }
    const buses = await this.db.query<BusRow>(
      `SELECT l.numero AS linea,u.numero_interno,u.placa,u.capacidad_maxima,u.estado,u.estado_operativo
         FROM rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea`,
    );
    for (const row of buses.rows) {
      const id = `${row.linea}-${row.numero_interno}`;
      const values = {
        plate: row.placa, max: row.capacidad_maxima, active: row.estado === 'habilitada',
        status: row.estado_operativo,
      };
      let bus = this.memory.buses.find((item) => item.id === id);
      if (bus) Object.assign(bus, values);
      else {
        const line = this.memory.lines.find((item) => item.id === row.linea)!;
        bus = {
          id, line: row.linea, internal: row.numero_interno, occupancy: 0, progress: 0,
          direction: 'ida', pos: interpolate(line.waypoints, 0), source: 'simulado',
          lastSeen: Date.now(), stale: false, onDuty: false, ...values,
        };
        this.memory.buses.push(bus);
      }
      this.buses.set(id, this.busPrint(bus));
    }
    const drivers = await this.db.query<{ identificador: string }>(
      `SELECT us.identificador FROM rutabol.conductor c JOIN rutabol.usuario us ON us.id_usuario=c.id_usuario`,
    );
    for (const { identificador } of drivers.rows) {
      const user = this.memory.users.get(identificador);
      if (user) this.drivers.set(identificador, this.driverPrint(user.profile));
    }
    const fares = await this.db.query<FareRow>(
      `SELECT cp.nombre,t.monto::float8 AS monto,t.vigente_desde
         FROM rutabol.tarifa t JOIN rutabol.categoria_pasajero cp ON cp.id_categoria=t.id_categoria
        ORDER BY t.vigente_desde`,
    );
    const history = new Map<number, Fares>();
    for (const row of fares.rows) {
      const at = row.vigente_desde.getTime();
      const entry = history.get(at) ?? { general: 0, escolar: 0, universitario: 0, validFrom: at };
      entry[row.nombre] = row.monto;
      history.set(at, entry);
    }
    if (history.size) {
      this.memory.fareHistory.splice(0, this.memory.fareHistory.length, ...history.values());
      this.savedFares = history.size;
    }
  }

  private linePrint = (line: Line) => JSON.stringify([line.name, line.active, line.waypoints]);
  private busPrint = (bus: Bus) => JSON.stringify([bus.plate, bus.max, bus.active, bus.status]);
  private driverPrint = (profile: { status: string; busId?: string }) =>
    JSON.stringify([profile.status, profile.busId]);

  async run() {
    const lines = this.memory.lines.filter((line) => this.lines.get(line.id) !== this.linePrint(line));
    const buses = this.memory.buses.filter((bus) => this.buses.get(bus.id) !== this.busPrint(bus));
    const drivers = [...this.memory.users.values()].filter(({ profile }) =>
      profile.role === 'chofer' && profile.busId &&
      this.drivers.get(profile.userId) !== this.driverPrint(profile));
    const fares = this.memory.fareHistory.slice(this.savedFares);
    if (!lines.length && !buses.length && !drivers.length && !fares.length) return;
    await this.db.tx(async (client) => {
      for (const line of lines) {
        await client.query(
          `INSERT INTO rutabol.linea(numero,nombre,estado) VALUES($1,$2,$3)
           ON CONFLICT (numero) DO UPDATE SET nombre=EXCLUDED.nombre,estado=EXCLUDED.estado`,
          [line.id, line.name, line.active ? 'activa' : 'inactiva'],
        );
        await client.query(
          `INSERT INTO rutabol.ruta(id_linea,nombre,origen,destino,sentido)
           SELECT id_linea,'Recorrido','Inicio de línea','Final de línea','circular'
             FROM rutabol.linea WHERE numero=$1
           ON CONFLICT (id_linea,nombre,sentido) DO NOTHING`,
          [line.id],
        );
        await client.query(
          `DELETE FROM rutabol.punto_ruta WHERE id_ruta=
             (SELECT r.id_ruta FROM rutabol.ruta r JOIN rutabol.linea l ON l.id_linea=r.id_linea
               WHERE l.numero=$1 AND r.nombre='Recorrido')`,
          [line.id],
        );
        await client.query(
          `INSERT INTO rutabol.punto_ruta(id_ruta,orden,latitud,longitud,tipo)
           SELECT r.id_ruta,p.ord,p.lat,p.lng,
                  CASE WHEN p.ord=1 THEN 'inicio' WHEN p.ord=cardinality($2::float8[]) THEN 'destino' ELSE 'parada' END
             FROM rutabol.ruta r JOIN rutabol.linea l ON l.id_linea=r.id_linea,
                  unnest($2::float8[],$3::float8[]) WITH ORDINALITY AS p(lat,lng,ord)
            WHERE l.numero=$1 AND r.nombre='Recorrido'`,
          [line.id, line.waypoints.map(([lat]) => lat), line.waypoints.map(([, lng]) => lng)],
        );
      }
      for (const bus of buses) {
        await client.query(
          `INSERT INTO rutabol.unidad_transporte(id_linea,numero_interno,placa,capacidad_maxima,estado,estado_operativo)
           SELECT id_linea,$2,$3,$4,$5,$6 FROM rutabol.linea WHERE numero=$1
           ON CONFLICT (id_linea,numero_interno) DO UPDATE SET placa=EXCLUDED.placa,
             capacidad_maxima=EXCLUDED.capacidad_maxima,estado=EXCLUDED.estado,
             estado_operativo=EXCLUDED.estado_operativo`,
          [bus.line, bus.internal, bus.plate, bus.max, bus.active ? 'habilitada' : 'deshabilitada', bus.status],
        );
      }
      for (const { profile } of drivers) {
        await client.query(
          `INSERT INTO rutabol.conductor(id_usuario,habilitado)
           SELECT id_usuario,$2 FROM rutabol.usuario WHERE identificador=$1
           ON CONFLICT (id_usuario) DO UPDATE SET habilitado=EXCLUDED.habilitado`,
          [profile.userId, profile.status === 'activo'],
        );
        await client.query(
          `INSERT INTO rutabol.asignacion_conductor(id_conductor,id_unidad)
           SELECT c.id_conductor,u.id_unidad
             FROM rutabol.conductor c
             JOIN rutabol.usuario us ON us.id_usuario=c.id_usuario,
                  rutabol.unidad_transporte u JOIN rutabol.linea l ON l.id_linea=u.id_linea
            WHERE us.identificador=$1 AND l.numero=$2 AND u.numero_interno=$3
              AND NOT EXISTS (SELECT 1 FROM rutabol.asignacion_conductor a
                               WHERE a.id_conductor=c.id_conductor AND a.estado='activa')`,
          [profile.userId, profile.line, profile.internal],
        );
      }
      for (const fare of fares) {
        await client.query(
          `UPDATE rutabol.tarifa SET vigente_hasta=to_timestamp($1/1000.0)
            WHERE vigente_hasta IS NULL AND vigente_desde<to_timestamp($1/1000.0)`,
          [fare.validFrom],
        );
        for (const category of ['general', 'escolar', 'universitario'] as const) {
          await client.query(
            `INSERT INTO rutabol.tarifa(id_categoria,monto,vigente_desde)
             SELECT id_categoria,$2,to_timestamp($3/1000.0) FROM rutabol.categoria_pasajero WHERE nombre=$1`,
            [category, fare[category], fare.validFrom],
          );
        }
      }
    });
    for (const line of lines) this.lines.set(line.id, this.linePrint(line));
    for (const bus of buses) this.buses.set(bus.id, this.busPrint(bus));
    for (const { profile } of drivers) this.drivers.set(profile.userId, this.driverPrint(profile));
    this.savedFares += fares.length;
  }
}
