export type Category = "general" | "escolar" | "universitario";

export interface Accreditation {
  id: string;
  userId: string;
  type: "escolar" | "universitario";
  institution: string;
  code: string;
  status: "pendiente" | "aprobada" | "observada" | "rechazada" | "vencida";
  emailVerified: boolean;
  validUntil?: number;
  note?: string;
  requestedAt: number;
  decidedAt?: number;
}

export interface Line {
  id: string;
  name: string;
  waypoints: [number, number][];
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
  direction: "ida" | "vuelta";
  pos: [number, number];
  source: "simulado" | "gps";
  lastSeen: number;
  stale: boolean;
  onDuty: boolean;
  status: "activo" | "descanso" | "emergencia";
  active: boolean;
}

export interface Driver {
  id?: string;
  userId?: string;
  name: string;
  line: string;
  internal: string;
  active?: boolean;
  status?: "activo" | "suspendido";
}

export interface HistoryEntry {
  at: number;
  status: string;
  by: string;
  note?: string;
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
  status: "recibido" | "en-revision" | "resuelto" | "rechazado";
  response?: string;
  refund?: number;
  at: number;
  updatedAt: number;
  history: HistoryEntry[];
}

export interface Incident {
  id: string;
  busId: string;
  line: string;
  internal: string;
  type: "accidente" | "falla-mecanica" | "bloqueo" | "averia" | "otro";
  description: string;
  pos?: [number, number];
  severity: "alta" | "media" | "baja";
  status: "reportado" | "en-atencion" | "resuelto";
  at: number;
  updatedAt: number;
  history: HistoryEntry[];
}

export interface Alert {
  id: string;
  busId: string;
  at: number;
  kind: "emergencia" | "aforo" | "incidente";
  message: string;
}

export interface Overview {
  kpis: {
    busesActivos: number;
    busesEnServicio: number;
    busesSinSenal: number;
    viajes: number;
    recaudacion: number;
    recaudacionPorCategoria: Record<Category, number>;
    ocupacionPromedioPct: number;
    incidentesAbiertos: number;
    reclamosAbiertos: number;
    acreditacionesPendientes: number;
    trasbordos: number;
    recargasPendientes: number;
  };
  byLine: {
    line: string;
    viajes: number;
    recaudacion: number;
    ocupacionPromedioPct: number;
    buses: number;
  }[];
  health: {
    id: string;
    title: string;
    ok: boolean;
    severity: "critica" | "aviso" | "info";
    detail: string;
  }[];
  buses: Bus[];
  alerts: Alert[];
  incidents: Incident[];
}

export interface Fares {
  general: number;
  escolar: number;
  universitario: number;
  validFrom: number;
}

export interface ControlUser {
  userId: string;
  name: string;
  role: "pasajero" | "chofer" | "control";
  category?: Category;
  codeMasked: string;
  status: "activo" | "suspendido";
  accreditationStatus?: Accreditation["status"];
  balance?: number;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorRole: string;
  action: string;
  target: string;
  result: "ok" | "error";
  detail: string;
}

export interface Report {
  rows: {
    ticketId: string;
    at: number;
    line: string;
    internal: string;
    category: Category;
    fare: number;
    method: string;
    status: string;
  }[];
  totals: Record<string, unknown>;
}
