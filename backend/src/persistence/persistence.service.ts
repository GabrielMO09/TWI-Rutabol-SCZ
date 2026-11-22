import { Injectable, Logger, Optional } from '@nestjs/common';
import type {
  CallHandler, ExecutionContext, NestInterceptor, OnApplicationShutdown, OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mergeMap } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { MemoryService } from '../micros/memory.service';
import type { Profile, Role, Secret, User } from '../micros/models';
import { InstitutionsStore } from '../institutions/institutions.store';
import { StopsStore } from '../stops/stops.store';
import { CatalogStore } from './catalog.store';
import { CasesStore } from './cases.store';
import { MoneyStore } from './money.store';
import { OperationsStore } from './operations.store';

interface UserRow {
  identificador: string; nombre_completo: string; codigo: string | null; foto: string | null;
  categoria: Profile['category'] | null; password_hash: string; estado: Profile['status'];
  creado_en: Date; rol: Role;
  ci: string | null; correo: string | null; telefono: string | null; acepto_terminos_en: Date | null;
}
interface SessionRow {
  token_hash: string; identificador: string; creada_en: Date; ultimo_uso: Date; expira_en: Date;
}

export const encodeSecret = (secret: Secret) => `scrypt$${secret.salt}$${secret.hash.toString('hex')}`;
export function decodeSecret(text: string): Secret {
  const [, salt, hash] = text.split('$');
  return { salt, hash: Buffer.from(hash, 'hex') };
}

/**
 * La memoria es el conjunto de trabajo y PostgreSQL la fuente de verdad para los datos persistidos.
 * SESSION_STORE=memory conserva las sesiones solo en el proceso.
 * Al arrancar se carga desde la BD; después de cada petición que modifica datos se guardan
 * solo las diferencias. shortcut: una sola instancia del backend; con varias habría que leer
 * de la BD en cada petición.
 */
@Injectable()
export class PersistenceService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PersistenceService.name);
  private readonly savedUsers = new Map<string, string>();
  private readonly savedSessions = new Map<string, string>();
  private readonly persistSessions = process.env.SESSION_STORE !== 'memory';
  private readonly catalog: CatalogStore;
  private readonly operations: OperationsStore;
  private readonly money: MoneyStore;
  private readonly cases: CasesStore;
  private readonly photoHashes = new Map<string, { photo: string; hash: string }>();
  private timer?: ReturnType<typeof setInterval>;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly db: DatabaseService,
    private readonly memory: MemoryService,
    @Optional() private readonly institutions?: InstitutionsStore,
    @Optional() private readonly stops?: StopsStore,
  ) {
    this.catalog = new CatalogStore(db, memory);
    this.operations = new OperationsStore(db, memory);
    this.money = new MoneyStore(db, memory);
    this.cases = new CasesStore(db, memory);
  }

  async onModuleInit() {
    await this.hydrate();
    // Cambios que no vienen de una petición (recargas que se confirman solas, etc.).
    this.timer = setInterval(() => void this.sync(), 10000);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.sync();
  }

  async hydrate() {
    const users = await this.db.query<UserRow>(
      `SELECT u.identificador,u.nombre_completo,u.codigo,u.foto,u.categoria,u.password_hash,
              u.estado,u.creado_en,u.ci,u.correo,u.telefono,u.acepto_terminos_en,r.nombre AS rol
         FROM rutabol.usuario u
         JOIN rutabol.usuario_rol ur ON ur.id_usuario=u.id_usuario
         JOIN rutabol.rol r ON r.id_rol=ur.id_rol`,
    );
    for (const row of users.rows) this.load(row);
    if (this.persistSessions) await this.hydrateSessions();
    const storedUsers = new Set(users.rows.map((row) => row.identificador));
    for (const [id, user] of this.memory.users) {
      if (storedUsers.has(id)) this.savedUsers.set(id, await this.userPrint(user));
    }
    await this.catalog.hydrate();
    await this.stops?.hydrate();
    await this.institutions?.hydrate();
    await this.operations.hydrate();
    await this.money.hydrate();
    await this.cases.hydrate();
    // Lo que exista en memoria y aún no esté en la BD (usuarios de demostración) se guarda ahora.
    await this.sync();
    this.logger.log(`Usuarios en base de datos: ${this.savedUsers.size}.`);
  }

  private async hydrateSessions() {
    const sessions = await this.db.query<SessionRow>(
      `SELECT s.token_hash,u.identificador,s.creada_en,s.ultimo_uso,s.expira_en
         FROM rutabol.sesion s JOIN rutabol.usuario u ON u.id_usuario=s.id_usuario
        WHERE s.revocada_en IS NULL AND s.expira_en>now()`,
    );
    for (const row of sessions.rows) {
      if (!this.memory.users.has(row.identificador)) continue;
      const session = {
        id: row.token_hash.slice(0, 16), userId: row.identificador,
        createdAt: row.creada_en.getTime(), lastSeenAt: row.ultimo_uso.getTime(),
        expiresAt: row.expira_en.getTime(),
      };
      this.memory.sessions.set(row.token_hash, session);
      this.savedSessions.set(row.token_hash, this.sessionPrint(session));
    }
  }

  /** Aplica una fila de la BD sobre la memoria (la BD manda sobre los datos de demostración). */
  private load(row: UserRow) {
    const secret = decodeSecret(row.password_hash);
    const identity = {
      ci: row.ci ?? undefined,
      email: row.correo?.toLowerCase(),
      phone: row.telefono ?? undefined,
      acceptedTermsAt: row.acepto_terminos_en?.getTime(),
    };
    const existing = this.memory.users.get(row.identificador);
    if (existing) {
      Object.assign(existing.profile, {
        ...identity,
        name: row.nombre_completo, status: row.estado, photo: row.foto ?? undefined,
      });
      existing.secret = Promise.resolve(secret);
      existing.createdAt = row.creado_en.getTime();
      return;
    }
    const profile: Profile = {
      ...identity,
      userId: row.identificador, role: row.rol, name: row.nombre_completo, status: row.estado,
      ...(row.categoria ? { category: row.categoria } : {}),
      ...(row.foto ? { photo: row.foto } : {}),
    };
    if (row.rol === 'chofer' && row.codigo) {
      const [line, internal] = row.codigo.split('-');
      Object.assign(profile, { busId: row.codigo, line, internal });
    } else if (row.codigo) {
      profile.code = row.codigo;
    }
    this.memory.addUser(profile, secret).createdAt = row.creado_en.getTime();
  }

  private async userPrint(user: User): Promise<string> {
    const { profile } = user;
    const secret = await user.secret;
    let photo = '';
    if (profile.photo) {
      // El hash de una foto de varios MB se calcula una sola vez mientras la foto no cambie.
      const cached = this.photoHashes.get(profile.userId);
      if (cached?.photo === profile.photo) photo = cached.hash;
      else {
        photo = createHash('sha1').update(profile.photo).digest('hex');
        this.photoHashes.set(profile.userId, { photo: profile.photo, hash: photo });
      }
    }
    return JSON.stringify([
      profile.name, profile.status, profile.category, profile.code ?? profile.busId, profile.role,
      profile.ci, profile.email, profile.phone, profile.acceptedTermsAt,
      photo, encodeSecret(secret),
    ]);
  }

  // El último uso se redondea al minuto para no escribir en la BD en cada petición.
  private sessionPrint(session: { expiresAt: number; lastSeenAt: number }) {
    return `${session.expiresAt}|${Math.floor(session.lastSeenAt / 60000)}`;
  }

  /** Guarda en PostgreSQL lo que cambió desde la última vez. Los errores se registran y se reintentan. */
  sync(): Promise<void> {
    this.queue = this.queue.then(() => this.runAll());
    return this.queue;
  }

  /** Cada paso aislado: si uno falla se registra y se reintenta, y los que dependen de él se saltan. */
  private async step(name: string, work: () => Promise<void>): Promise<boolean> {
    try {
      await work();
      return true;
    } catch (error) {
      this.logger.error(`No se pudo guardar ${name} en PostgreSQL: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  private async runAll() {
    if (!await this.step('usuarios y sesiones', () => this.run())) return;
    if (!await this.step('el catálogo', () => this.catalog.run())) return;
    if (this.stops) {
      const stops = this.stops;
      await this.step('las paradas', () => stops.run());
    }
    await this.step('la operación', () => this.operations.run());
    if (await this.step('el dinero (tarjetas y pasajes)', () => this.money.runMoney())) {
      await this.step('los reclamos', () => this.cases.runClaims());
    }
    await this.step('las acreditaciones', () => this.cases.runAccreditations());
  }

  private async run() {
    const users: [string, User, string][] = [];
    for (const [id, user] of this.memory.users) {
      const print = await this.userPrint(user);
      if (this.savedUsers.get(id) !== print) users.push([id, user, print]);
    }
    const sessions = this.persistSessions
      ? [...this.memory.sessions].flatMap(([key, session]) => {
          const print = this.sessionPrint(session);
          return this.savedSessions.get(key) === print ? [] : [[key, session, print] as const];
        })
      : [];
    const revoked = this.persistSessions
      ? [...this.savedSessions.keys()].filter((key) => !this.memory.sessions.has(key))
      : [];
    if (!users.length && !sessions.length && !revoked.length) return;
    await this.db.tx(async (client) => {
      for (const [id, user] of users) {
        const { profile } = user;
        await client.query(
          `INSERT INTO rutabol.usuario(identificador,nombre_completo,codigo,correo,foto,categoria,
                                       password_hash,estado,ci,telefono,acepto_terminos_en)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,to_timestamp($11/1000.0))
           ON CONFLICT (identificador) DO UPDATE SET nombre_completo=EXCLUDED.nombre_completo,
             codigo=EXCLUDED.codigo,foto=EXCLUDED.foto,categoria=EXCLUDED.categoria,
             password_hash=EXCLUDED.password_hash,estado=EXCLUDED.estado,
             ci=coalesce(EXCLUDED.ci,usuario.ci),correo=coalesce(EXCLUDED.correo,usuario.correo),
             telefono=coalesce(EXCLUDED.telefono,usuario.telefono),
             acepto_terminos_en=coalesce(EXCLUDED.acepto_terminos_en,usuario.acepto_terminos_en)`,
          [
            id, profile.name, profile.code ?? profile.busId ?? null,
            profile.email ?? (profile.role !== 'chofer' && id.includes('@') ? id : null),
            profile.photo ?? null, profile.category ?? null,
            encodeSecret(await user.secret), profile.status, profile.ci ?? null,
            profile.phone ?? null, profile.acceptedTermsAt ?? null,
          ],
        );
        await client.query(
          `INSERT INTO rutabol.usuario_rol(id_usuario,id_rol)
           SELECT u.id_usuario,r.id_rol FROM rutabol.usuario u, rutabol.rol r
            WHERE u.identificador=$1 AND r.nombre=$2 ON CONFLICT DO NOTHING`,
          [id, profile.role],
        );
      }
      for (const [key, session] of sessions) {
        await client.query(
          `INSERT INTO rutabol.sesion(id_usuario,token_hash,creada_en,ultimo_uso,expira_en)
           VALUES((SELECT id_usuario FROM rutabol.usuario WHERE identificador=$2),$1,
                  to_timestamp($3/1000.0),to_timestamp($4/1000.0),to_timestamp($5/1000.0))
           ON CONFLICT (token_hash) DO UPDATE SET ultimo_uso=EXCLUDED.ultimo_uso,expira_en=EXCLUDED.expira_en`,
          [key, session.userId, session.createdAt, session.lastSeenAt, session.expiresAt],
        );
      }
      for (const key of revoked) {
        await client.query(
          'UPDATE rutabol.sesion SET revocada_en=now() WHERE token_hash=$1 AND revocada_en IS NULL', [key],
        );
      }
    });
    for (const [id, , print] of users) this.savedUsers.set(id, print);
    for (const [key, , print] of sessions) this.savedSessions.set(key, print);
    for (const key of revoked) this.savedSessions.delete(key);
  }
}

/** Tras cada petición que modifica datos (POST/PATCH/PUT/DELETE) guarda los cambios antes de responder. */
@Injectable()
export class PersistInterceptor implements NestInterceptor {
  constructor(private readonly persistence: PersistenceService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const method: string = context.switchToHttp().getRequest().method;
    if (method === 'GET' || method === 'HEAD') return next.handle();
    return next.handle().pipe(mergeMap(async (value) => {
      await this.persistence.sync();
      return value;
    }));
  }
}
