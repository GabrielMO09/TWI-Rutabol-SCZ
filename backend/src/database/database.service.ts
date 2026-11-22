import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_APP_USER', 'DB_APP_PASSWORD'] as const;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor() {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Faltan variables en backend/.env: ${missing.join(', ')}`);
    }
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_APP_USER,
      password: process.env.DB_APP_PASSWORD,
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    this.pool.on('error', (error) => this.logger.error(`Conexión inactiva con error: ${error.message}`));
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
      this.logger.log(`PostgreSQL conectado (${process.env.DB_NAME}).`);
    } catch (error) {
      throw new Error(`No se pudo conectar a PostgreSQL: ${error instanceof Error ? error.message : error}`);
    }
  }

  onModuleDestroy() {
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
