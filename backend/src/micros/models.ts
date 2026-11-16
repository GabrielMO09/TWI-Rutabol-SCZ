export type Category = 'escolar' | 'universitario' | 'general';
export type Role = 'pasajero' | 'chofer' | 'control';
export type Position = [number, number];

export interface Accreditation {
  id: string;
  userId: string;
  type: Exclude<Category, 'general'>;
  institution: string;
  code: string;
  status: 'pendiente' | 'aprobada' | 'observada' | 'rechazada' | 'vencida';
  emailVerified: boolean;
  validUntil?: number;
  note?: string;
  requestedAt: number;
  decidedAt?: number;
}

export interface Profile {
  userId: string;
  role: Role;
  name: string;
  category?: Category;
  code?: string;
  photo?: string;
  line?: string;
  internal?: string;
  busId?: string;
  status: 'activo' | 'suspendido';
  accreditation?: Accreditation;
  fareCategory?: Category;
}

export interface Secret {
  salt: string;
  hash: Buffer;
}

export interface User {
  profile: Profile;
  createdAt: number;
  secret: Promise<Secret>;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

export interface Line {
  id: string;
  name: string;
  waypoints: Position[];
  active: boolean;
}

export interface Bus {
  id: string;
  line: string;
  internal: string;
  plate: string;
  max: number;
  occupancy: number;
  progress: number;
  direction: 'ida' | 'vuelta';
  pos: Position;
  source: 'simulado' | 'gps';
  lastSeen: number;
  stale: boolean;
  onDuty: boolean;
  startedAt?: number;
  status: 'activo' | 'descanso' | 'emergencia';
  active: boolean;
}

export interface Ticket {
  id: string;
  busId: string;
  line: string;
  internal: string;
  fare: number;
  category: Category;
  fareReason: string;
  method: 'Credicard' | 'Efectivo';
  at: number;
  status: 'pagado' | 'abordado' | 'rechazado' | 'pase-temporal';
  transferredTo?: string;
  passCode?: string;
  receiptNo: string;
  idempotencyKey?: string;
}

export interface BoardingReq {
  id: string;
  busId: string;
  ticketId?: string;
  userId?: string;
  name: string;
  category: Category;
  code: string;
  photo?: string;
  fare: number;
}

export interface Alert {
  id: string;
  busId: string;
  at: number;
  kind: 'emergencia' | 'aforo' | 'incidente';
  message: string;
}

export interface LedgerEntry {
  id: string;
  at: number;
  fromBus: string;
  toBus: string;
  passengers: number;
  amount: number;
  creditedTo: 'descanso' | 'saliente';
}

export interface Pass {
  id: string;
  code: string;
  fromBus: string;
  toBus: string;
  expires: number;
  usedAt?: number;
}

export interface Movement {
  id: string;
  at: number;
  type: 'recarga' | 'pasaje' | 'ajuste' | 'devolucion';
  amount: number;
  status: 'confirmado' | 'pendiente' | 'rechazado';
  ref: string;
  balanceAfter: number;
}

export interface Wallet {
  cardNumber: string;
  balance: number;
  status: 'activa' | 'bloqueada';
  physicalLinked?: string;
  movements: Movement[];
}

export interface Recharge {
  id: string;
  at: number;
  amount: number;
  method: 'qr' | 'transferencia' | 'tarjeta';
  status: 'pendiente' | 'confirmada' | 'fallida';
  idempotencyKey: string;
  note?: string;
}

export interface Notification {
  id: string;
  at: number;
  kind: string;
  title: string;
  body: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorRole: Role;
  action: string;
  target: string;
  result: 'ok' | 'error';
  detail: string;
}

export interface Fares {
  general: number;
  escolar: number;
  universitario: number;
  validFrom: number;
}

export interface Incident {
  id: string;
  busId: string;
  line: string;
  internal: string;
  type: 'accidente' | 'falla-mecanica' | 'bloqueo' | 'averia' | 'otro';
  description: string;
  pos?: Position;
  severity: 'alta' | 'media' | 'baja';
  status: 'reportado' | 'en-atencion' | 'resuelto';
  at: number;
  updatedAt: number;
  history: { at: number; status: Incident['status']; by: string }[];
}

export interface Claim {
  id: string;
  userId: string;
  name: string;
  line: string;
  internal: string;
  tripAt: number;
  description: string;
  evidence?: string;
  ticketId?: string;
  status: 'recibido' | 'en-revision' | 'resuelto' | 'rechazado';
  response?: string;
  refund?: number;
  at: number;
  updatedAt: number;
  history: { at: number; status: Claim['status']; by: string; note?: string }[];
}

export interface OccupancyEvent {
  id: string;
  at: number;
  busId: string;
  kind: 'subida' | 'bajada' | 'correccion';
  from: number;
  to: number;
  reason?: string;
  by: string;
}

export const FARES: Fares = {
  general: 3.5,
  escolar: 1,
  universitario: 1,
  validFrom: 0,
};
