import type { DatabaseService } from '../database/database.service';
import { maskCode } from '../micros/input';
import type { MemoryService } from '../micros/memory.service';
import type {
  Category, LedgerEntry, Movement, Pass, Recharge, Ticket, Wallet,
} from '../micros/models';

const round = (value: number) => Math.round(value * 100) / 100;
const TICKET_FROM_DB: Record<string, Ticket['status']> = {
  pagado: 'pagado', abordado: 'abordado', rechazado: 'rechazado', pase_temporal: 'pase-temporal',
};
const TICKET_TO_DB: Record<Ticket['status'], string> = {
  pagado: 'pagado', abordado: 'abordado', rechazado: 'rechazado', 'pase-temporal': 'pase_temporal',
};
const RECHARGE_FROM_MOVEMENT: Record<Movement['status'], Recharge['status']> = {
  confirmado: 'confirmada', pendiente: 'pendiente', rechazado: 'fallida',
};

/**
 * Credicard, recargas, pasajes, pases y trasbordos. El backend decide tarifas y cobros; la base los
 * registra con funciones que son idempotentes y no permiten saldo negativo.
 */
export class MoneyStore {
  private readonly cards = new Map<string, string>();
  private readonly movements = new Map<string, string>();
  private readonly tickets = new Map<string, string>();
  private readonly passes = new Map<string, string>();
  private readonly ledger = new Set<string>();

  /** Transacción compartida de runMoney: débito y pasaje se confirman juntos o ninguno (RNF-14). */
  private shared?: { client: Parameters<Parameters<DatabaseService['tx']>[0]>[0]; apply: (() => void)[] };

  constructor(private readonly db: DatabaseService, private readonly memory: MemoryService) {}

  /** Tarjetas y pasajes en UNA transacción; las cachés solo se actualizan tras el COMMIT. */
  async runMoney() {
    const apply: (() => void)[] = [];
    await this.db.tx(async (client) => {
      this.shared = { client, apply };
      try {
        await this.runWallets();
        await this.runTickets();
      } finally {
        this.shared = undefined;
      }
    });
    for (const fn of apply) fn();
  }

  private async tx(work: Parameters<DatabaseService['tx']>[0], saved: (() => void)[]) {
    if (this.shared) {
      await work(this.shared.client);
      this.shared.apply.push(...saved);
      return;
    }
    await this.db.tx(work);
    for (const fn of saved) fn();
  }

  async hydrate() {
    await this.hydrateWallets();
    await this.hydrateTickets();
    await this.hydratePasses();
  }

  private async hydrateWallets() {
    const cards = await this.db.query<{
      identificador: string; tarjeta: string; saldo: number; estado: Wallet['status']; tarjeta_fisica: string | null;
    }>(
      `SELECT u.identificador,tj.identificador AS tarjeta,tj.saldo::float8 AS saldo,tj.estado,tj.tarjeta_fisica
         FROM rutabol.tarjeta_credicard tj JOIN rutabol.usuario u ON u.id_usuario=tj.id_usuario
        WHERE tj.estado<>'cancelada'`,
    );
    for (const row of cards.rows) {
      const wallet: Wallet = {
        cardNumber: row.tarjeta, balance: row.saldo, status: row.estado, movements: [],
        ...(row.tarjeta_fisica ? { physicalLinked: row.tarjeta_fisica } : {}),
      };
      this.memory.wallets.set(row.identificador, wallet);
      this.memory.recharges.set(row.identificador, []);
      this.cards.set(row.identificador, this.cardPrint(wallet));
    }
    const moves = await this.db.query<{
      identificador: string; tipo: Movement['type']; monto: number; estado: Movement['status'];
      referencia: string; saldo_posterior: number; fecha: Date; canal: string | null;
      clave_cliente: string | null; nota: string | null;
    }>(
      `SELECT u.identificador,m.tipo,m.monto::float8 AS monto,m.estado,m.referencia,
              m.saldo_posterior::float8 AS saldo_posterior,m.fecha,r.canal,r.clave_cliente,r.nota
         FROM rutabol.movimiento_saldo m
         JOIN rutabol.tarjeta_credicard tj ON tj.id_tarjeta=m.id_tarjeta
         JOIN rutabol.usuario u ON u.id_usuario=tj.id_usuario
         LEFT JOIN rutabol.recarga r ON r.id_recarga=m.id_recarga
        ORDER BY m.fecha,m.id_movimiento`,
    );
    for (const row of moves.rows) {
      const wallet = this.memory.wallets.get(row.identificador);
      if (!wallet) continue;
      const movement: Movement = {
        id: this.memory.nextId('MOV'), at: row.fecha.getTime(), type: row.tipo, amount: row.monto,
        status: row.estado, ref: row.referencia, balanceAfter: row.saldo_posterior,
      };
      wallet.movements.push(movement);
      this.movements.set(`${row.tipo}|${row.referencia}`, row.estado);
      this.memory.adopt(row.referencia);
      if (row.tipo === 'recarga') {
        this.memory.recharges.get(row.identificador)!.push({
          id: row.referencia, at: row.fecha.getTime(), amount: row.monto,
          method: (row.canal ?? 'qr') as Recharge['method'], status: RECHARGE_FROM_MOVEMENT[row.estado],
          idempotencyKey: row.clave_cliente ?? row.referencia, ...(row.nota ? { note: row.nota } : {}),
        });
      }
    }
    // Una recarga que quedó pendiente al apagar el backend se resuelve con la misma regla de demostración.
    for (const [userId, wallet] of this.memory.wallets) {
      for (const recharge of this.memory.recharges.get(userId) ?? []) {
        if (recharge.status !== 'pendiente') continue;
        const failed = Math.round(recharge.amount * 100) % 100 === 99;
        const movement = wallet.movements.find((item) => item.ref === recharge.id);
        recharge.status = failed ? 'fallida' : 'confirmada';
        if (failed) recharge.note = 'El proveedor rechazó la recarga de demostración.';
        if (!failed) wallet.balance = round(wallet.balance + recharge.amount);
        if (movement) {
          movement.status = failed ? 'rechazado' : 'confirmado';
          movement.balanceAfter = wallet.balance;
        }
      }
    }
  }

  private async hydrateTickets() {
    const rows = await this.db.query<{
      ref_app: string; usuario: string | null; linea: string; numero_interno: string; monto: number;
      categoria: Category; razon_tarifa: string | null; metodo: string; fecha: Date; estado_abordaje: string;
      linea_destino: string | null; interno_destino: string | null; codigo_pase: string | null;
      numero_comprobante: string; clave_cliente: string | null;
    }>(
      `SELECT tp.ref_app,us.identificador AS usuario,l.numero AS linea,ut.numero_interno,tp.monto::float8 AS monto,
              tp.categoria,tp.razon_tarifa,tp.metodo,tp.fecha,tp.estado_abordaje,ld.numero AS linea_destino,
              ud.numero_interno AS interno_destino,tp.codigo_pase,tp.numero_comprobante,tp.clave_cliente
         FROM rutabol.transaccion_pago tp
         JOIN rutabol.unidad_transporte ut ON ut.id_unidad=tp.id_unidad
         JOIN rutabol.linea l ON l.id_linea=ut.id_linea
         LEFT JOIN rutabol.usuario us ON us.id_usuario=tp.id_usuario
         LEFT JOIN rutabol.unidad_transporte ud ON ud.id_unidad=tp.id_unidad_destino
         LEFT JOIN rutabol.linea ld ON ld.id_linea=ud.id_linea
        ORDER BY tp.fecha,tp.id_transaccion`,
    );
    for (const row of rows.rows) {
      this.memory.adopt(row.ref_app);
      this.memory.adoptReceipt(row.numero_comprobante);
      const ticket: Ticket = {
        id: row.ref_app, busId: `${row.linea}-${row.numero_interno}`, line: row.linea,
        internal: row.numero_interno, fare: row.monto, category: row.categoria,
        fareReason: row.razon_tarifa ?? '', method: row.metodo === 'efectivo' ? 'Efectivo' : 'Credicard',
        at: row.fecha.getTime(), status: TICKET_FROM_DB[row.estado_abordaje] ?? 'pagado',
        receiptNo: row.numero_comprobante,
        ...(row.linea_destino ? { transferredTo: `${row.linea_destino}-${row.interno_destino}` } : {}),
        ...(row.codigo_pase ? { passCode: row.codigo_pase } : {}),
        ...(row.clave_cliente ? { idempotencyKey: row.clave_cliente } : {}),
      };
      this.memory.tickets.push(ticket);
      if (row.usuario) this.memory.ticketOwners.set(ticket.id, row.usuario);
      this.tickets.set(ticket.id, this.ticketPrint(ticket));
      // Un pasaje pagado y aún sin decisión del chofer vuelve a su lista de abordaje.
      const profile = row.usuario ? this.memory.users.get(row.usuario)?.profile : undefined;
      if (ticket.status === 'pagado' && profile) {
        this.memory.reqs.push({
          id: this.memory.nextId('REQ'), busId: ticket.busId, ticketId: ticket.id, userId: profile.userId,
          name: profile.name, category: ticket.category, code: maskCode(profile.code ?? ''),
          photo: profile.photo, fare: ticket.fare,
        });
      }
    }
  }

  private async hydratePasses() {
    const passes = await this.db.query<{
      ref_app: string; codigo: string; desde: string; hacia: string; expira_en: Date; usado_en: Date | null;
    }>(
      `SELECT p.ref_app,p.codigo,(lo.numero||'-'||uo.numero_interno) AS desde,(ld.numero||'-'||ud.numero_interno) AS hacia,
              p.expira_en,p.usado_en
         FROM rutabol.pase_temporal p
         JOIN rutabol.unidad_transporte uo ON uo.id_unidad=p.id_unidad_origen
         JOIN rutabol.linea lo ON lo.id_linea=uo.id_linea
         JOIN rutabol.unidad_transporte ud ON ud.id_unidad=p.id_unidad_destino
         JOIN rutabol.linea ld ON ld.id_linea=ud.id_linea
        ORDER BY p.id_pase`,
    );
    for (const row of passes.rows) {
      this.memory.adopt(row.ref_app);
      this.memory.adopt(row.codigo);
      const pass: Pass = {
        id: row.ref_app, code: row.codigo, fromBus: row.desde, toBus: row.hacia,
        expires: row.expira_en.getTime(), ...(row.usado_en ? { usedAt: row.usado_en.getTime() } : {}),
      };
      this.memory.passes.push(pass);
      this.passes.set(pass.id, this.passPrint(pass));
    }
    const ledger = await this.db.query<{
      ref_app: string; fecha: Date; desde: string; hacia: string; pasajeros: number; monto_total: number;
      acreditado_a: LedgerEntry['creditedTo'];
    }>(
      `SELECT t.ref_app,t.fecha,(lo.numero||'-'||uo.numero_interno) AS desde,(ld.numero||'-'||ud.numero_interno) AS hacia,
              t.pasajeros,t.monto_total::float8 AS monto_total,t.acreditado_a
         FROM rutabol.trasbordo t
         JOIN rutabol.unidad_transporte uo ON uo.id_unidad=t.id_unidad_origen
         JOIN rutabol.linea lo ON lo.id_linea=uo.id_linea
         JOIN rutabol.unidad_transporte ud ON ud.id_unidad=t.id_unidad_destino
         JOIN rutabol.linea ld ON ld.id_linea=ud.id_linea
        WHERE t.motivo='descanso' ORDER BY t.id_trasbordo`,
    );
    for (const row of ledger.rows) {
      this.memory.adopt(row.ref_app);
      this.memory.ledger.push({
        id: row.ref_app, at: row.fecha.getTime(), fromBus: row.desde, toBus: row.hacia,
        passengers: row.pasajeros, amount: row.monto_total, creditedTo: row.acreditado_a ?? 'descanso',
      });
      this.ledger.add(row.ref_app);
    }
  }

  private cardPrint = (wallet: Wallet) => JSON.stringify([wallet.status, wallet.physicalLinked ?? null]);
  private ticketPrint = (ticket: Ticket) =>
    JSON.stringify([ticket.status, ticket.transferredTo ?? null, ticket.passCode ?? null]);
  private passPrint = (pass: Pass) => JSON.stringify([pass.expires, pass.usedAt ?? null]);

  /** Tarjetas y movimientos. */
  async runWallets() {
    const saved: (() => void)[] = [];
    await this.tx(async (client) => {
      for (const [userId, wallet] of this.memory.wallets) {
        const print = this.cardPrint(wallet);
        if (!this.cards.has(userId)) {
          await client.query(
            `INSERT INTO rutabol.tarjeta_credicard(id_usuario,identificador,estado,tarjeta_fisica)
             SELECT id_usuario,$2,$3,$4 FROM rutabol.usuario WHERE identificador=$1
             ON CONFLICT (identificador) DO NOTHING`,
            [userId, wallet.cardNumber, wallet.status, wallet.physicalLinked ?? null],
          );
          // Saldo con el que ya contaba la cuenta (demostración): se registra como apertura.
          const confirmed = wallet.movements
            .filter((item) => item.status === 'confirmado').reduce((sum, item) => sum + item.amount, 0);
          const opening = round(wallet.balance - confirmed);
          if (opening > 0) {
            await this.move(client, userId, {
              ref: `apertura:${wallet.cardNumber}`, tipo: 'ajuste', monto: opening, estado: 'confirmado',
              motivo: 'Saldo inicial', fecha: Date.now(),
            });
          }
          saved.push(() => this.cards.set(userId, print));
        } else if (this.cards.get(userId) !== print) {
          await client.query(
            'UPDATE rutabol.tarjeta_credicard SET estado=$2,tarjeta_fisica=$3 WHERE identificador=$1',
            [wallet.cardNumber, wallet.status, wallet.physicalLinked ?? null],
          );
          saved.push(() => this.cards.set(userId, print));
        }
        for (const movement of wallet.movements) {
          const key = `${movement.type}|${movement.ref}`;
          const known = this.movements.get(key);
          if (known === movement.status) continue;
          if (known === undefined) {
            const recharge = movement.type === 'recarga'
              ? this.memory.recharges.get(userId)?.find((item) => item.id === movement.ref) : undefined;
            await this.move(client, userId, {
              ref: movement.ref, tipo: movement.type, monto: movement.amount, estado: movement.status,
              fecha: movement.at, canal: recharge?.method, clave_cliente: recharge?.idempotencyKey,
              nota: recharge?.note,
            });
          } else {
            await client.query('SELECT rutabol.resolver_movimiento($1,$2,$3)', [
              movement.ref, movement.status,
              this.memory.recharges.get(userId)?.find((item) => item.id === movement.ref)?.note ?? null,
            ]);
          }
          saved.push(() => this.movements.set(key, movement.status));
        }
      }
    }, saved);
  }

  private move(
    client: { query: (sql: string, params: unknown[]) => Promise<unknown> }, userId: string,
    data: Record<string, unknown>,
  ) {
    return client.query('SELECT rutabol.registrar_movimiento($1::jsonb)', [JSON.stringify({ usuario: userId, ...data })]);
  }

  /** Pasajes, pases y trasbordos (después de las tarjetas: un pasaje necesita la tarjeta del pasajero). */
  async runTickets() {
    const tickets = this.memory.tickets.filter((item) => this.tickets.get(item.id) !== this.ticketPrint(item));
    const passes = this.memory.passes.filter((item) => this.passes.get(item.id) !== this.passPrint(item));
    const ledger = this.memory.ledger.filter((item) => !this.ledger.has(item.id));
    if (!tickets.length && !passes.length && !ledger.length) return;
    const saved: (() => void)[] = [];
    await this.tx(async (client) => {
      for (const ticket of tickets) {
        const [destLine, ...rest] = ticket.transferredTo?.split('-') ?? [];
        await client.query('SELECT rutabol.registrar_ticket($1::jsonb)', [JSON.stringify({
          ref: ticket.id, usuario: this.memory.ticketOwners.get(ticket.id) ?? null, linea: ticket.line,
          interno: ticket.internal, metodo: ticket.method === 'Efectivo' ? 'efectivo' : 'credicard',
          monto: ticket.fare, categoria: ticket.category, razon: ticket.fareReason,
          comprobante: ticket.receiptNo, clave_cliente: ticket.idempotencyKey ?? null, fecha: ticket.at,
          estado_abordaje: TICKET_TO_DB[ticket.status], codigo_pase: ticket.passCode ?? null,
          linea_destino: destLine ?? null, interno_destino: rest.join('-') || null,
        })]);
      }
      for (const pass of passes) {
        await client.query(
          `INSERT INTO rutabol.pase_temporal(ref_app,codigo,id_unidad_origen,id_unidad_destino,expira_en,usado_en)
           SELECT $1,$2,uo.id_unidad,ud.id_unidad,to_timestamp($5/1000.0),to_timestamp($6/1000.0)
             FROM rutabol.unidad_transporte uo JOIN rutabol.linea lo ON lo.id_linea=uo.id_linea,
                  rutabol.unidad_transporte ud JOIN rutabol.linea ld ON ld.id_linea=ud.id_linea
            WHERE (lo.numero||'-'||uo.numero_interno)=$3 AND (ld.numero||'-'||ud.numero_interno)=$4
           ON CONFLICT (ref_app) DO UPDATE SET expira_en=EXCLUDED.expira_en,usado_en=EXCLUDED.usado_en`,
          [pass.id, pass.code, pass.fromBus, pass.toBus, pass.expires, pass.usedAt ?? null],
        );
      }
      for (const entry of ledger) {
        await client.query(
          `INSERT INTO rutabol.trasbordo(ref_app,motivo,id_unidad_origen,id_unidad_destino,fecha,pasajeros,monto_total,acreditado_a)
           SELECT $1,'descanso',uo.id_unidad,ud.id_unidad,to_timestamp($4/1000.0),$5,$6,$7
             FROM rutabol.unidad_transporte uo JOIN rutabol.linea lo ON lo.id_linea=uo.id_linea,
                  rutabol.unidad_transporte ud JOIN rutabol.linea ld ON ld.id_linea=ud.id_linea
            WHERE (lo.numero||'-'||uo.numero_interno)=$2 AND (ld.numero||'-'||ud.numero_interno)=$3
           ON CONFLICT (ref_app) DO NOTHING`,
          [entry.id, entry.fromBus, entry.toBus, entry.at, entry.passengers, entry.amount, entry.creditedTo],
        );
      }
      for (const ticket of tickets) saved.push(() => this.tickets.set(ticket.id, this.ticketPrint(ticket)));
      for (const pass of passes) saved.push(() => this.passes.set(pass.id, this.passPrint(pass)));
      for (const entry of ledger) saved.push(() => this.ledger.add(entry.id));
    }, saved);
  }
}
