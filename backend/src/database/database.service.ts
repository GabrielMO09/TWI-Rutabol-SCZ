import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

/** Una base de datos PostgreSQL: un pool con `query` y `tx`. */
export class Db {
  private readonly pool: Pool;

  constructor(readonly name: string, config: { database: string; user: string; password: string }, onError: (m: string) => void) {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      ...config,
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    this.pool.on('error', (error) => onError(`Conexión inactiva con error (${name}): ${error.message}`));
  }

  ping() {
    return this.pool.query('SELECT 1');
  }

  end() {
    return this.pool.end();
  }

  /** Siempre con parámetros ($1, $2): nunca concatenar valores del usuario en el SQL. */
  query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /** Ejecuta varias consultas en una sola transacción; revierte si algo falla. */
  async tx<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

const logger = new Logger('DatabaseService');
const REQUIRED = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_APP_USER', 'DB_APP_PASSWORD',
  'DB_ACADEMICO_NAME', 'DB_ACADEMICO_USER', 'DB_ACADEMICO_PASSWORD',
  'DB_TRANSPORTE_NAME', 'DB_TRANSPORTE_USER', 'DB_TRANSPORTE_PASSWORD',
] as const;

/**
 * Tres bases en un mismo servidor: la propia (`query`/`tx`, operación de Rutabol-SCZ),
 * `academic` (registro académico) y `transport` (registro de transporte). Entre bases no hay FK.
 */
@Injectable()
export class DatabaseService extends Db implements OnModuleInit, OnModuleDestroy {
  readonly academic: Db;
  readonly transport: Db;

  constructor() {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Faltan variables en backend/.env: ${missing.join(', ')}`);
    }
    const log = (message: string) => logger.error(message);
    super('rutabol', {
      database: process.env.DB_NAME!, user: process.env.DB_APP_USER!, password: process.env.DB_APP_PASSWORD!,
    }, log);
    this.academic = new Db('académico', {
      database: process.env.DB_ACADEMICO_NAME!, user: process.env.DB_ACADEMICO_USER!,
      password: process.env.DB_ACADEMICO_PASSWORD!,
    }, log);
    this.transport = new Db('transporte', {
      database: process.env.DB_TRANSPORTE_NAME!, user: process.env.DB_TRANSPORTE_USER!,
      password: process.env.DB_TRANSPORTE_PASSWORD!,
    }, log);
  }

  /** Las tres bases, para la comprobación de salud. */
  get all(): Db[] {
    return [this, this.academic, this.transport];
  }

  async onModuleInit() {
    try {
      await Promise.all(this.all.map((db) => db.ping()));
      logger.log('PostgreSQL conectado: rutabol, registro académico y registro de transporte.');
    } catch (error) {
      throw new Error(`No se pudo conectar a PostgreSQL: ${error instanceof Error ? error.message : error}`);
    }
  }

  async onModuleDestroy() {
    await Promise.all([this.academic.end(), this.transport.end()]);
    await this.end();
  }
}
