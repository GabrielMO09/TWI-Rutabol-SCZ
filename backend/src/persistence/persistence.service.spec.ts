import { fixture } from '../test-support';
import { PersistenceService, encodeSecret } from './persistence.service';
import { hashPassword } from '../shared/security';

type Call = { sql: string; params: unknown[] };

class FakeDb {
  calls: Call[] = [];
  users: Record<string, unknown>[] = [];
  sessions: Record<string, unknown>[] = [];

  query = (sql: string, params: unknown[] = []) => {
    this.calls.push({ sql, params });
    if (sql.includes('count(*)::int')) return Promise.resolve({ rows: [{ n: 0 }] });
    if (sql.includes('FROM rutabol.usuario u')) return Promise.resolve({ rows: this.users });
    if (sql.includes('FROM rutabol.sesion s')) return Promise.resolve({ rows: this.sessions });
    return Promise.resolve({ rows: [] });
  };

  tx = <T>(work: (client: { query: FakeDb['query'] }) => Promise<T>) => work({ query: this.query });

  // Las bases de los registros usan el mismo registro de llamadas; los SQL se distinguen por su esquema.
  get transport() {
    return { query: (sql: string, params?: unknown[]) => this.query(sql, params), tx: this.tx };
  }

  get academic() {
    return this.transport;
  }

  count(fragment: string) {
    return this.calls.filter((call) => call.sql.includes(fragment)).length;
  }
}

async function setup() {
  const ctx = fixture();
  await ctx.ready;
  const db = new FakeDb();
  const persistence = new PersistenceService(db as never, ctx.memory);
  return { ctx, db, persistence };
}

describe('PersistenceService', () => {
  it('con la BD vacía guarda los usuarios de demostración una sola vez', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    expect(db.count('INSERT INTO rutabol.usuario(')).toBe(ctx.memory.users.size);
    db.calls.length = 0;
    await persistence.sync();
    expect(db.calls).toHaveLength(0);
    ctx.close();
  });

  it('guarda solo la sesión nueva y revoca la cerrada, sin guardar el token en claro', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    db.calls.length = 0;
    const { token } = await ctx.auth.loginPassenger({ id: '7654321', password: '123456' });
    await persistence.sync();
    expect(db.count('INSERT INTO rutabol.sesion')).toBe(1);
    expect(db.calls.flatMap((call) => call.params)).not.toContain(token);
    db.calls.length = 0;
    ctx.auth.logout(`Bearer ${token}`);
    await persistence.sync();
    expect(db.count('UPDATE rutabol.sesion SET revocada_en')).toBe(1);
    ctx.close();
  });

  it('un cambio de contraseña guarda únicamente a ese usuario', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    const { token } = await ctx.auth.loginPassenger({ id: '7654321', password: '123456' });
    await persistence.sync();
    db.calls.length = 0;
    await ctx.auth.changePassword({ current: '123456', next: 'nueva-clave-9' }, `Bearer ${token}`);
    await persistence.sync();
    expect(db.count('INSERT INTO rutabol.usuario(')).toBe(1);
    expect(db.calls.find((call) => call.sql.includes('INSERT INTO rutabol.usuario('))!.params[0])
      .toBe('7654321');
    ctx.close();
  });

  it('al arrancar la BD manda: estado, contraseña y sesiones guardadas', async () => {
    const { ctx, db, persistence } = await setup();
    const secret = await hashPassword('otra-clave-77');
    const now = new Date();
    db.users = [{
      identificador: 'control@rutabol.bo', nombre_completo: 'Control Renombrado', codigo: null,
      foto: null, categoria: null, password_hash: encodeSecret(secret), estado: 'suspendido',
      creado_en: now, rol: 'control',
    }, {
      identificador: '9999999', nombre_completo: 'Nuevo Pasajero', codigo: '9999999',
      foto: null, categoria: 'general', password_hash: encodeSecret(secret), estado: 'activo',
      creado_en: now, rol: 'pasajero',
    }];
    db.sessions = [{
      token_hash: 'a'.repeat(64), identificador: '9999999', creada_en: now, ultimo_uso: now,
      expira_en: new Date(Date.now() + 3600000),
    }];
    await persistence.hydrate();
    expect(ctx.memory.users.get('control@rutabol.bo')!.profile).toMatchObject({
      name: 'Control Renombrado', status: 'suspendido',
    });
    expect(ctx.memory.users.get('9999999')!.profile).toMatchObject({ code: '9999999', role: 'pasajero' });
    expect(ctx.memory.sessions.get('a'.repeat(64))).toMatchObject({ userId: '9999999' });
    await expect(ctx.auth.loginControl({ id: 'control@rutabol.bo', password: 'otra-clave-77' }))
      .rejects.toThrow('suspendida');
    ctx.close();
  });

  it('con la BD vacía guarda líneas, unidades, conductores y la tarifa inicial', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    expect(db.count('INSERT INTO transporte.linea')).toBe(3);
    expect(db.count('INSERT INTO transporte.punto_ruta')).toBe(3);
    expect(db.count('INSERT INTO transporte.unidad_transporte')).toBe(5);
    expect(db.count('INSERT INTO rutabol.linea')).toBe(3);
    expect(db.count('INSERT INTO rutabol.unidad_transporte')).toBe(5);
    expect(db.count('INSERT INTO rutabol.conductor')).toBe(3);
    expect(db.count('INSERT INTO rutabol.asignacion_conductor')).toBe(3);
    expect(db.count('INSERT INTO rutabol.tarifa')).toBe(3);
    ctx.close();
  });

  it('modificar una unidad o las tarifas guarda solo ese cambio', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    const actor = ctx.memory.users.get('control@rutabol.bo')!.profile;
    db.calls.length = 0;
    ctx.control.updateBus(actor, '17-045', { plate: '9999-ZZZ' });
    await persistence.sync();
    expect(db.count('INSERT INTO transporte.unidad_transporte')).toBe(1);
    expect(db.count('INSERT INTO rutabol.unidad_transporte')).toBe(1);
    expect(db.count('INSERT INTO transporte.linea')).toBe(0);
    expect(db.count('INSERT INTO rutabol.linea')).toBe(0);
    db.calls.length = 0;
    ctx.fares.update(actor, { general: 4, reason: 'nueva disposicion oficial' });
    await persistence.sync();
    expect(db.count('UPDATE rutabol.tarifa SET vigente_hasta')).toBe(1);
    expect(db.count('INSERT INTO rutabol.tarifa')).toBe(3);
    ctx.close();
  });

  it('al arrancar la BD manda: línea nueva, unidad nueva y tarifa vigente', async () => {
    const { ctx, db, persistence } = await setup();
    const since = new Date('2026-01-01T04:00:00Z');
    db.query = ((sql: string) => {
      db.calls.push({ sql, params: [] });
      if (sql.includes('FROM transporte.linea l')) {
        return Promise.resolve({ rows: [{ numero: '90', nombre: 'Línea 90', estado: 'activa', puntos: [[-17.78, -63.18], [-17.79, -63.17]] }] });
      }
      if (sql.includes('FROM transporte.unidad_transporte u')) {
        return Promise.resolve({ rows: [{ linea: '90', numero_interno: '001', placa: '1111-AAA', capacidad_maxima: 21, estado: 'habilitada' }] });
      }
      if (sql.includes('FROM rutabol.tarifa t')) {
        return Promise.resolve({ rows: [
          { nombre: 'general', monto: 5, vigente_desde: since },
          { nombre: 'escolar', monto: 2, vigente_desde: since },
          { nombre: 'universitario', monto: 2, vigente_desde: since },
        ] });
      }
      return Promise.resolve({ rows: [] });
    }) as never;
    await persistence.hydrate();
    expect(ctx.memory.lines.find((line) => line.id === '90')!.waypoints).toHaveLength(2);
    expect(ctx.memory.buses.find((bus) => bus.id === '90-001')).toMatchObject({ max: 21, plate: '1111-AAA' });
    expect(ctx.fares.current()).toMatchObject({ general: 5, escolar: 2, universitario: 2 });
    expect(ctx.memory.fareHistory).toHaveLength(1);
    ctx.close();
  });

  it('guarda la auditoría y la notificación nuevas sin repetir las ya guardadas', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    db.calls.length = 0;
    await ctx.auth.loginControl({ id: 'control@rutabol.bo', password: 'control123' });
    await persistence.sync();
    expect(db.count('INSERT INTO rutabol.auditoria')).toBe(1);
    ctx.notifications.push('7654321', 'saldo', 'Aviso', 'Mensaje de prueba');
    await persistence.sync();
    expect(db.count('INSERT INTO rutabol.notificacion')).toBe(1);
    db.calls.length = 0;
    await persistence.sync();
    expect(db.calls).toHaveLength(0);
    ctx.close();
  });

  it('un incidente se guarda con su historial y la ocupación del simulador no', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    const { token } = await ctx.auth.loginDriver({ line: '17', internal: '045', pin: '1234' });
    db.calls.length = 0;
    ctx.ops.reportIncident({ type: 'accidente', description: 'Choque leve en la avenida' }, `Bearer ${token}`);
    ctx.ops.correct('17-045', { occupancy: 7, reason: 'conteo manual' }, `Bearer ${token}`);
    ctx.memory.tick();
    await persistence.sync();
    expect(db.count('INSERT INTO rutabol.incidencia')).toBe(1);
    expect(db.count('INSERT INTO rutabol.historial_incidencia')).toBe(1);
    expect(db.count('INSERT INTO rutabol.alerta')).toBe(1);
    const saved = db.calls.filter((call) => call.sql.includes('INSERT INTO rutabol.registro_ocupacion'));
    expect(saved).toHaveLength(1);
    expect(saved[0].params[2]).toBe('correccion');
    ctx.close();
  });

  it('al arrancar recupera incidentes y no repite ids nuevos', async () => {
    const { ctx, db, persistence } = await setup();
    const at = new Date('2026-11-17T12:00:00Z');
    const base = db.query;
    db.query = ((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM rutabol.incidencia i')) {
        return Promise.resolve({ rows: [{
          ref_app: 'INC-000900', linea: '17', numero_interno: '045', tipo: 'falla_mecanica', severidad: 'alta',
          descripcion: 'Motor recalentado', lat: -17.78, lng: -63.18, fecha: at, estado: 'en_atencion',
          historial: [{ at: at.getTime(), status: 'reportada', by: 'chofer:17-045' }],
        }] });
      }
      return base(sql, params);
    }) as never;
    await persistence.hydrate();
    expect(ctx.memory.incidents).toHaveLength(1);
    expect(ctx.memory.incidents[0]).toMatchObject({ id: 'INC-000900', type: 'falla-mecanica', status: 'en-atencion' });
    expect(ctx.memory.nextId('INC')).toBe('INC-000901');
    ctx.close();
  });

  it('con la BD vacía guarda tarjetas con su saldo inicial y las acreditaciones', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    expect(db.count('INSERT INTO rutabol.tarjeta_credicard')).toBe(4);
    const openings = db.calls.filter((call) => call.sql.includes('registrar_movimiento'));
    expect(openings).toHaveLength(4);
    expect(JSON.parse(openings[0].params[0] as string)).toMatchObject({ tipo: 'ajuste', motivo: 'Saldo inicial' });
    expect(db.count('INSERT INTO rutabol.solicitud_validacion')).toBe(3);
    ctx.close();
  });

  it('un pasaje con Credicard guarda el movimiento y el ticket una sola vez', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    const { token } = await ctx.auth.loginPassenger({ id: 'estudiante@upds.edu.bo', password: '123456' });
    db.calls.length = 0;
    const ticket = ctx.micros.createTicket(
      { busId: '17-045', idempotencyKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }, `Bearer ${token}`,
    );
    await persistence.sync();
    const move = db.calls.find((call) => call.sql.includes('registrar_movimiento'))!;
    expect(JSON.parse(move.params[0] as string)).toMatchObject({ ref: ticket.id, tipo: 'pasaje', monto: -1 });
    const saved = db.calls.find((call) => call.sql.includes('registrar_ticket'))!;
    expect(JSON.parse(saved.params[0] as string)).toMatchObject({
      ref: ticket.id, metodo: 'credicard', categoria: 'universitario', clave_cliente: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    db.calls.length = 0;
    await persistence.sync();
    expect(db.calls).toHaveLength(0);
    ctx.close();
  });

  it('una recarga pendiente se registra y luego se resuelve', async () => {
    const { ctx, db, persistence } = await setup();
    await persistence.hydrate();
    ctx.wallet.recharge('7654321', { amount: 10, method: 'qr', idempotencyKey: 'rec-0000-0000-0000-0001' });
    db.calls.length = 0;
    await persistence.sync();
    expect(JSON.parse(db.calls.find((call) => call.sql.includes('registrar_movimiento'))!.params[0] as string))
      .toMatchObject({ tipo: 'recarga', estado: 'pendiente', canal: 'qr' });
    await new Promise((resolve) => setTimeout(resolve, 2200));
    db.calls.length = 0;
    await persistence.sync();
    expect(db.count('resolver_movimiento')).toBe(1);
    ctx.close();
  });

  it('al arrancar recupera tarjeta, pasaje (y su abordaje pendiente), acreditación y reclamo', async () => {
    const { ctx, db, persistence } = await setup();
    const at = new Date('2026-11-17T12:00:00Z');
    const base = db.query;
    db.query = ((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM rutabol.tarjeta_credicard tj JOIN')) {
        return Promise.resolve({ rows: [{ identificador: '7654321', tarjeta: 'CRD-0000-0000-4242', saldo: 12.5, estado: 'activa', tarjeta_fisica: null }] });
      }
      if (sql.includes('FROM rutabol.movimiento_saldo m')) {
        return Promise.resolve({ rows: [
          { identificador: '7654321', tipo: 'recarga', monto: 20, estado: 'confirmado', referencia: 'REC-000500', saldo_posterior: 20, fecha: at, canal: 'qr', clave_cliente: 'clave-guardada', nota: null },
          { identificador: '7654321', tipo: 'recarga', monto: 10.5, estado: 'pendiente', referencia: 'REC-000501', saldo_posterior: 20, fecha: at, canal: 'qr', clave_cliente: 'otra-clave', nota: null },
        ] });
      }
      if (sql.includes('FROM rutabol.transaccion_pago tp')) {
        return Promise.resolve({ rows: [{
          ref_app: 'T-000600', usuario: '7654321', linea: '17', numero_interno: '045', monto: 3.5, categoria: 'general',
          razon_tarifa: 'Tarifa general', metodo: 'credicard', fecha: at, estado_abordaje: 'pagado',
          linea_destino: null, interno_destino: null, codigo_pase: null, numero_comprobante: 'R-000700', clave_cliente: 'clave-ticket',
        }] });
      }
      if (sql.includes('FROM rutabol.solicitud_validacion s')) {
        return Promise.resolve({ rows: [{
          ref_app: 'AC-000800', identificador: 'lucia.vaca@upds.edu.bo', nivel: 'universitario', institucion: 'UPDS',
          rude: null, correo_institucional: 'lucia.vaca@upds.edu.bo', estado: 'aprobada', correo_verificado: true,
          vigencia_hasta: new Date('2027-01-01T00:00:00Z'), nota: null, fecha_solicitud: at, fecha_resolucion: at,
        }] });
      }
      if (sql.includes('FROM rutabol.reclamo r')) {
        return Promise.resolve({ rows: [{
          ref_app: 'CL-000900', identificador: '7654321', nombre_completo: 'Pasajero General', linea: '17',
          numero_interno: '045', fecha_hecho: at, descripcion: 'Me cobraron de más', evidencia: null,
          ticket: 'T-000600', estado: 'en_revision', respuesta: null, monto: null, fecha: at, actualizado_en: at,
          historial: [{ at: at.getTime(), status: 'recibido', by: '7654321', note: '' }],
        }] });
      }
      return base(sql, params);
    }) as never;
    await persistence.hydrate();
    const wallet = ctx.memory.wallets.get('7654321')!;
    expect(wallet).toMatchObject({ cardNumber: 'CRD-0000-0000-4242', status: 'activa' });
    expect(wallet.balance).toBe(23); // 12,5 guardado + 10,5 de la recarga que quedó pendiente y se resolvió
    expect(ctx.memory.recharges.get('7654321')![0]).toMatchObject({ id: 'REC-000500', idempotencyKey: 'clave-guardada' });
    expect(ctx.memory.tickets[0]).toMatchObject({ id: 'T-000600', status: 'pagado', idempotencyKey: 'clave-ticket' });
    expect(ctx.memory.reqs.some((req) => req.ticketId === 'T-000600')).toBe(true);
    expect(ctx.memory.nextReceipt()).toBe('R-000701');
    expect(ctx.accreditation.get('lucia.vaca@upds.edu.bo')).toMatchObject({ id: 'AC-000800', status: 'aprobada' });
    expect(ctx.memory.claims[0]).toMatchObject({ id: 'CL-000900', status: 'en-revision', ticketId: 'T-000600' });
    ctx.close();
  });
});
