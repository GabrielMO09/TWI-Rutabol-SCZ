import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  Accreditation, Alert, AuditEntry, BoardingReq, Bus, Claim, Fares,
  Incident, LedgerEntry, Line, Notification, OccupancyEvent, Pass,
  Profile, Recharge, Secret, Session, Ticket, User, Wallet,
} from './models';
import { FARES } from './models';
import { maskCode } from './input';
import { EventsService } from '../shared/events.service';
import { interpolate } from '../shared/geo';
import { demoSeed, hashPassword } from '../shared/security';
import { changeOccupancy, syncCapacity } from '../ops/occupancy';

export const LOGIN_ATTEMPT_WINDOW = 5 * 60_000;
export const LOGIN_STRIKE_TTL = 24 * 60 * 60_000;
export const LOGIN_ACCOUNT_WINDOW = 60 * 60_000;
export const RECOVERY_REQUEST_WINDOW = 60 * 60_000;

@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
  readonly users = new Map<string, User>();
  readonly sessions = new Map<string, Session>();
  readonly wallets = new Map<string, Wallet>();
  readonly accreditations: Accreditation[] = [];
  readonly recharges = new Map<string, Recharge[]>();
  readonly notifications = new Map<string, Notification[]>();
  readonly audit: AuditEntry[] = [];
  readonly fareHistory: Fares[] = [{ ...FARES, validFrom: Date.now() }];
  readonly lines: Line[] = [
    {
      id: '17', name: 'Línea 17 - Norte', active: true,
      waypoints: [
        [-17.7834, -63.1821], [-17.77, -63.179],
        [-17.756, -63.176], [-17.742, -63.173],
      ],
    },
    {
      id: '44', name: 'Línea 44 - Sur', active: true,
      waypoints: [
        [-17.7834, -63.1821], [-17.799, -63.18],
        [-17.815, -63.176], [-17.831, -63.172],
      ],
    },
    {
      id: '11', name: 'Línea 11 - Este', active: true,
      waypoints: [
        [-17.7834, -63.1821], [-17.785, -63.162],
        [-17.788, -63.143], [-17.79, -63.126],
      ],
    },
  ];
  readonly buses: Bus[];
  readonly reqs: BoardingReq[] = [];
  readonly tickets: Ticket[] = [];
  readonly ticketOwners = new Map<string, string>();
  readonly ledger: LedgerEntry[] = [];
  readonly passes: Pass[] = [];
  readonly alerts: Alert[] = [];
  readonly incidents: Incident[] = [];
  readonly claims: Claim[] = [];
  readonly occupancyEvents: OccupancyEvent[] = [];
  readonly emailCodes = new Map<string, {
    code: string; expiresAt: number; attempts: number;
  }>();
  readonly recoveryCodes = new Map<string, {
    code: string; expiresAt: number; attempts: number;
  }>();
  readonly recoveryRequests = new Map<string, {
    issuedAt: number[]; blockedUntil: number;
  }>();
  readonly credentials = new Map<string, {
    userId: string; expiresAt: number; usedAt?: number;
  }>();
  readonly loginAttempts = new Map<string, {
    failures: number; firstAt: number; lastAt: number; strikes: number; blockedUntil?: number;
  }>();
  readonly loginAccountAttempts = new Map<string, {
    failedAt: number[]; blockedUntil: number;
  }>();

  private sequence = 0;
  private receiptSequence = 0;
  private readonly seededRequests = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;
  private lastTickAt?: number;

  constructor(readonly events: EventsService) {
    const now = Date.now();
    const seeds: [string, string, number, number, number, string][] = [
      ['17', '045', 25, 12, 0.3, '2345-ABC'],
      ['17', '078', 20, 17, 0.55, '2346-BCD'],
      ['44', '057', 22, 9, 0.4, '2347-CDE'],
      ['11', '033', 18, 6, 0.5, '2348-DEF'],
      ['11', '099', 25, 2, 0.9, '2349-EFG'],
    ];
    this.buses = seeds.map(([line, internal, max, occupancy, progress, plate]) => ({
      id: `${line}-${internal}`, line, internal, max, occupancy, progress, plate,
      direction: progress < 0.5 ? 'ida' : 'vuelta',
      pos: interpolate(this.lines.find((item) => item.id === line)!.waypoints, progress),
      source: 'simulado', lastSeen: now, stale: false,
      onDuty: true, startedAt: now, status: 'activo', active: true,
    }));

    const passengers: [string, string, NonNullable<Profile['category']>, number][] = [
      ['estudiante@upds.edu.bo', 'Estudiante de Prueba', 'universitario', 20],
      ['RUDE80480123', 'Diego Salvatierra', 'escolar', 15],
      ['lucia.vaca@upds.edu.bo', 'Lucía Vaca', 'universitario', 10],
      ['7654321', 'Pasajero General', 'general', 30],
    ];
    // Cuentas de demostración (claves fijas): solo con ENABLE_DEMO_SEED=true.
    if (!demoSeed()) return;
    for (const [code, name, category, balance] of passengers) {
      const profile: Profile = {
        userId: code.toLowerCase(), role: 'pasajero', name,
        category, code, status: 'activo',
      };
      this.addUser(profile, '123456', balance);
      if (category !== 'general') {
        const pending = code.startsWith('lucia.');
        this.accreditations.push({
          id: this.nextId('AC'), userId: profile.userId, type: category,
          institution: category === 'universitario' ? 'UPDS' : 'Unidad educativa',
          code, status: pending ? 'pendiente' : 'aprobada',
          emailVerified: !pending, requestedAt: now,
          ...(pending ? {} : {
            decidedAt: now, validUntil: now + 180 * 86400000,
          }),
        });
      }
    }
    this.addUser({
      userId: 'control@rutabol.bo', role: 'control',
      name: 'Centro de Control', status: 'activo',
    }, 'control123');
    for (const [line, internal, name] of [
      ['17', '045', 'Carlos Mamani'],
      ['44', '057', 'Raúl Justiniano'],
      ['11', '033', 'José Taborga'],
    ]) {
      this.addUser({
        userId: `chofer:${line}-${internal}`, role: 'chofer', name,
        line, internal, busId: `${line}-${internal}`, status: 'activo',
      }, '1234');
    }
  }

  addUser(profile: Profile, password: string | Secret, balance = 0): User {
    const user: User = {
      profile: { ...profile }, createdAt: Date.now(), secret: typeof password === 'string' ? hashPassword(password) : Promise.resolve(password),
    };
    this.users.set(profile.userId, user);
    if (profile.role === 'pasajero') {
      const taken = new Set([...this.wallets.values()].map((wallet) => wallet.cardNumber));
      let cardNumber = '';
      do {
        const suffix = String(randomBytes(2).readUInt16BE() % 10000).padStart(4, '0');
        cardNumber = `CRD-0000-0000-${suffix}`;
      } while (taken.has(cardNumber));
      this.wallets.set(profile.userId, {
        cardNumber,
        balance, status: 'activa', movements: [],
      });
      this.recharges.set(profile.userId, []);
      this.notifications.set(profile.userId, []);
    }
    return user;
  }

  nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${String(this.sequence).padStart(6, '0')}`;
  }

  /** Tras cargar un id guardado, evita que nextId vuelva a generar uno igual. */
  adopt(id: string): void {
    // Solo ids con el formato de nextId (PREFIJO-000123); otras referencias no cuentan.
    const used = Number(/^[A-Za-z]+-(\d+)$/.exec(id)?.[1] ?? 0);
    if (used > this.sequence) this.sequence = used;
  }

  /** Igual que adopt, para los números de comprobante (R-000012). */
  adoptReceipt(receipt: string): void {
    const used = Number(/(\d+)$/.exec(receipt)?.[1] ?? 0);
    if (used > this.receiptSequence) this.receiptSequence = used;
  }

  nextReceipt(): string {
    this.receiptSequence += 1;
    return `R-${String(this.receiptSequence).padStart(6, '0')}`;
  }

  seedRequests(busId: string): void {
    if (this.seededRequests.has(busId)) return;
    this.seededRequests.add(busId);
    for (const userId of [
      'estudiante@upds.edu.bo', 'rude80480123', 'lucia.vaca@upds.edu.bo',
    ]) {
      const profile = this.users.get(userId)!.profile;
      const accreditation = this.accreditations.find((item) => item.userId === userId);
      const category =
        accreditation?.status === 'aprobada' &&
        (accreditation.validUntil ?? 0) > Date.now()
          ? accreditation.type : 'general';
      this.reqs.push({
        id: this.nextId('REQ'), busId, userId, name: profile.name,
        category, code: maskCode(profile.code ?? ''), photo: profile.photo,
        fare: this.fareHistory[this.fareHistory.length - 1][category],
      });
    }
    this.events.emit();
  }

  refreshBus(bus: Bus, now = Date.now()): void {
    bus.stale = now - bus.lastSeen >= 30000;
    if (bus.source === 'simulado') {
      bus.direction = bus.progress < 0.5 ? 'ida' : 'vuelta';
      const line = this.lines.find((item) => item.id === bus.line);
      if (line) bus.pos = interpolate(line.waypoints, bus.progress);
    }
  }

  simulatorHealth(): { ok: boolean; detail: string } {
    const ok = this.timer !== undefined &&
      this.lastTickAt !== undefined && Date.now() - this.lastTickAt < 12000;
    return {
      ok,
      detail: ok
        ? 'Simulador activo; intervalo de 4 segundos.'
        : 'El simulador está detenido o no ha emitido un tick reciente.',
    };
  }

  onModuleInit(): void {
    if (this.timer) return;
    this.lastTickAt = Date.now();
    this.timer = setInterval(() => this.tick(), 4000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  tick(): void {
    const now = Date.now();
    this.lastTickAt = now;
    const drivenBuses = new Set(
      [...this.sessions.values()]
        .filter((session) => session.expiresAt > now)
        .map((session) => this.users.get(session.userId)?.profile)
        .filter((profile) => profile?.role === 'chofer' && profile.status === 'activo')
        .map((profile) => profile?.busId),
    );
    for (const bus of this.buses) {
      const lineActive = this.lines.some((line) => line.id === bus.line && line.active);
      if (bus.active && lineActive && bus.onDuty && bus.source === 'simulado') {
        bus.lastSeen = now;
        if (bus.status === 'activo') {
          bus.progress = (bus.progress + 0.003) % 1;
          if (!drivenBuses.has(bus.id) && Math.random() < 0.25) {
            const pending = this.reqs.filter((req) => req.busId === bus.id).length;
            const change = Math.random() < 0.5 ? -1 : 1;
            if (change < 0) {
              changeOccupancy(this, bus, Math.max(0, bus.occupancy - 1), 'bajada', 'simulador');
            } else if (bus.occupancy + pending < bus.max) {
              changeOccupancy(this, bus, bus.occupancy + 1, 'subida', 'simulador');
            }
          }
        }
      }
      this.refreshBus(bus, now);
      syncCapacity(this, bus);
    }
    for (const [nonce, credential] of this.credentials) {
      if (credential.expiresAt <= now) this.credentials.delete(nonce);
    }
    for (const codes of [this.emailCodes, this.recoveryCodes]) {
      for (const [key, value] of codes) {
        if (value.expiresAt <= now) codes.delete(key);
      }
    }
    for (const [key, requests] of this.recoveryRequests) {
      if (requests.blockedUntil <= now &&
        requests.issuedAt.every((issuedAt) => issuedAt + RECOVERY_REQUEST_WINDOW <= now)) {
        this.recoveryRequests.delete(key);
      }
    }
    for (const [key, attempt] of this.loginAttempts) {
      const expiresAt = attempt.strikes > 0
        ? attempt.lastAt + LOGIN_STRIKE_TTL : attempt.firstAt + LOGIN_ATTEMPT_WINDOW;
      if (expiresAt <= now) {
        this.loginAttempts.delete(key);
      }
    }
    for (const [key, account] of this.loginAccountAttempts) {
      account.failedAt = account.failedAt.filter((at) => at + LOGIN_ACCOUNT_WINDOW > now);
      if (account.blockedUntil <= now && account.failedAt.length === 0) {
        this.loginAccountAttempts.delete(key);
      }
    }
    this.events.emit();
  }
}
