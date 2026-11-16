"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LINES, TICK_MS, haversineKm, type Category, type LatLng } from "./data";
import { API, ApiError, TOKEN_KEY, api, newKey, readToken } from "./api";
import { fetchLinePath, roundTrip } from "./routes";

export type Role = "pasajero" | "chofer" | "control";
export type AccStatus = "pendiente" | "aprobada" | "observada" | "rechazada" | "vencida";
export type BusStatus = "activo" | "descanso" | "emergencia";

export interface Accreditation {
  id: string;
  userId: string;
  type: "escolar" | "universitario";
  institution: string;
  code: string;
  status: AccStatus;
  emailVerified: boolean;
  validUntil?: number;
  note?: string;
  requestedAt: number;
  decidedAt?: number;
}
export interface Profile {
  userId?: string;
  status?: "activo" | "suspendido";
  accreditation?: Accreditation | null;
  fareCategory?: Category;
  role: Role;
  name: string;
  category?: Category;
  code?: string;
  photo?: string;
  line?: string;
  internal?: string;
  busId?: string;
}
export interface Bus {
  id: string;
  line: string;
  internal: string;
  plate?: string;
  direction?: "ida" | "vuelta";
  source?: "simulado" | "gps";
  lastSeen?: number;
  stale?: boolean;
  onDuty?: boolean;
  active?: boolean;
  max: number;
  occupancy: number;
  progress: number;
  pos: LatLng;
  status: BusStatus;
}
export interface Ticket {
  id: string;
  busId: string;
  line?: string;
  internal?: string;
  fareReason?: string;
  passCode?: string;
  receiptNo?: string;
  fare: number;
  category: Category;
  method: string;
  at: number;
  status: "pagado" | "abordado" | "rechazado" | "pase-temporal";
  transferredTo?: string;
}
export interface BoardingReq {
  id: string;
  busId: string;
  ticketId?: string;
  name: string;
  category: Category;
  code: string;
  photo?: string;
  fare: number;
}
export interface LedgerEntry {
  id: string;
  at: number;
  fromBus: string;
  toBus: string;
  passengers: number;
  amount: number;
  creditedTo: "descanso" | "saliente";
}
export interface Pass {
  id: string;
  usedAt?: number;
  code: string;
  fromBus: string;
  toBus: string;
  expires: number;
}
export interface Alert {
  id: string;
  busId: string;
  at: number;
  kind?: "emergencia" | "aforo" | "incidente";
  message?: string;
}
export interface Incident {
  id: string;
  busId: string;
  line: string;
  internal: string;
  type: "accidente" | "falla-mecanica" | "bloqueo" | "averia" | "otro";
  description: string;
  severity: "alta" | "media" | "baja";
  status: "reportado" | "en-atencion" | "resuelto";
  at: number;
  updatedAt: number;
}
export interface OccupancyEvent {
  id: string;
  at: number;
  busId: string;
  kind: "subida" | "bajada" | "correccion";
  from: number;
  to: number;
  reason?: string;
  by?: string;
}
export interface Jornada {
  onDuty: boolean;
  startedAt?: number;
  busId?: string;
}
interface World {
  buses: Bus[];
  tickets: Ticket[];
  reqs: BoardingReq[];
  ledger: LedgerEntry[];
  passes: Pass[];
  alerts: Alert[];
  incidents: Incident[];
  occupancyEvents: OccupancyEvent[];
  jornada: Jornada | null;
}
// El backend envía el progreso sobre la línea; la posición se calcula aquí con la ruta real.
type PublicWorld = { buses: Bus[]; alerts: Alert[]; incidents: Incident[] };
type DriverState = Pick<World, "reqs" | "ledger" | "passes" | "incidents" | "occupancyEvents" | "jornada">;
export interface RegisterData {
  name: string;
  category: Category;
  code: string;
  password: string;
  photo: string;
  acceptTerms: boolean;
  institution?: string;
}

const SESSION_KEY = "rutabol-session";
const posAt = (path: LatLng[], p: number): LatLng =>
  path[Math.min(path.length - 1, Math.floor(p * path.length))];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function initialPaths(): Record<string, LatLng[]> {
  return Object.fromEntries(LINES.map((l) => [l.id, roundTrip(l.waypoints)]));
}

type Result = Promise<string | null>;
interface AppCtx {
  ready: boolean;
  profile: Profile | null;
  world: World;
  paths: Record<string, LatLng[]>;
  selectedBusId: string | null;
  unread: number;
  devCode: string | null;
  selectBus: (id: string | null) => void;
  refresh: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  logout: () => void;
  registerStudent: (d: RegisterData) => Result;
  loginPassenger: (id: string, password: string) => Result;
  loginDriver: (line: string, internal: string, pin: string) => Result;
  loginControl: (id: string, password: string) => Result;
  payTicket: (busId: string, idempotencyKey: string) => Promise<{ error?: string; ticket?: Ticket }>;
  validateBoarding: (reqId: string, accept: boolean) => Result;
  registerDisembark: (busId: string) => Result;
  setMax: (busId: string, max: number) => Result;
  startEmergency: (busId: string) => Result;
  resolveEmergency: (busId: string) => Result;
  emergencyTransfer: (busId: string, rescueId: string) => Result;
  restTransfer: (busId: string, toId: string, creditedTo: "descanso" | "saliente") => Result;
  resumeService: (busId: string) => Result;
  dismissAlert: (id: string) => Result;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fuera de AppProvider");
  return c;
}

const EMPTY_DRIVER: DriverState = {
  reqs: [],
  ledger: [],
  passes: [],
  incidents: [],
  occupancyEvents: [],
  jornada: null,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paths, setPaths] = useState(initialPaths);
  const [pub, setPub] = useState<PublicWorld>({ buses: [], alerts: [], incidents: [] });
  const [driver, setDriver] = useState<DriverState>(EMPTY_DRIVER);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unread, setUnread] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [selectedBusId, selectBus] = useState<string | null>(null);
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  const world = useMemo<World>(
    () => ({
      ...driver,
      alerts: pub.alerts,
      incidents: pub.incidents.length ? pub.incidents : driver.incidents,
      tickets,
      buses: pub.buses.map((b) => ({
        ...b,
        // Con GPS real se usa la posición enviada; si no, se proyecta sobre la ruta calculada.
        pos: b.source === "gps" ? b.pos : posAt(paths[b.line] ?? [], b.progress),
      })),
    }),
    [pub, driver, tickets, paths],
  );

  const clearSession = () => {
    setProfile(null);
    setTickets([]);
    setDriver(EMPTY_DRIVER);
    setUnread(0);
    selectBus(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };

  const saveProfile = (p: Profile) => {
    setProfile(p);
    profileRef.current = p;
    saveJson(SESSION_KEY, p);
  };

  const reloadProfile = async () => {
    try {
      saveProfile(await api<Profile>("/auth/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) clearSession();
    }
  };

  const refresh = async () => {
    try {
      setPub(await api<PublicWorld>("/world"));
    } catch {}
    const role = profileRef.current?.role;
    try {
      if (role === "chofer") setDriver(await api<DriverState>("/driver/state"));
      if (role === "pasajero") {
        const [t, n, me] = await Promise.all([
          api<Ticket[]>("/tickets/me"),
          api<{ read: boolean }[]>("/notifications/me"),
          api<Profile>("/auth/me"),
        ]);
        setTickets(t);
        setUnread(n.filter((x) => !x.read).length);
        saveProfile(me);
      }
    } catch (e) {
      // El backend reinició o la sesión expiró: se cierra la sesión local.
      if (e instanceof ApiError && e.status === 401) clearSession();
    }
  };
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const saved = loadJson<Profile | null>(SESSION_KEY, null);
    if (saved && readToken()) setProfile(saved);
    setReady(true);
    void refreshRef.current();
    // Tiempo real por SSE; si la conexión falla, se consulta cada TICK_MS.
    let sseOpen = false;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API}/events`);
      es.onopen = () => (sseOpen = true);
      es.onerror = () => (sseOpen = false);
      es.onmessage = () => void refreshRef.current();
    } catch {}
    const id = setInterval(() => {
      if (!sseOpen) void refreshRef.current();
    }, TICK_MS);
    const slow = setInterval(() => void refreshRef.current(), 15000);
    return () => {
      es?.close();
      clearInterval(id);
      clearInterval(slow);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(LINES.map(async (l) => [l.id, await fetchLinePath(l)] as const)).then((res) => {
      if (cancelled) return;
      setPaths((prev) => {
        const next = { ...prev };
        for (const [id, p] of res) if (p) next[id] = p;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = (r: { token: string; profile: Profile; devCode?: string }) => {
    try {
      localStorage.setItem(TOKEN_KEY, r.token);
    } catch {}
    setDevCode(r.devCode ?? null);
    saveProfile(r.profile);
    void refresh();
  };

  const logout = () => {
    void api("/auth/logout", "POST").catch(() => {});
    clearSession();
  };

  // Ejecuta un comando y refresca el mundo; devuelve el mensaje de error o null.
  const run = async (path: string, method = "POST", body?: unknown): Result => {
    try {
      await api(path, method, body);
      await refresh();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  const auth = async (path: string, body: unknown): Result => {
    try {
      startSession(await api(path, "POST", body));
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  const payTicket: AppCtx["payTicket"] = async (busId, idempotencyKey) => {
    try {
      const ticket = await api<Ticket>("/tickets", "POST", { busId, idempotencyKey });
      await refresh();
      return { ticket };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  return (
    <Ctx.Provider
      value={{
        ready,
        profile,
        world,
        paths,
        selectedBusId,
        unread,
        devCode,
        selectBus,
        refresh,
        reloadProfile,
        logout,
        registerStudent: (d) => auth("/auth/register", d),
        loginPassenger: (id, password) => auth("/auth/login/passenger", { id, password }),
        loginDriver: (line, internal, pin) =>
          auth("/auth/login/driver", { line, internal: internal.trim(), pin }),
        loginControl: (id, password) => auth("/auth/login/control", { id, password }),
        payTicket,
        validateBoarding: (reqId, accept) => run(`/reqs/${reqId}/decision`, "POST", { accept }),
        registerDisembark: (id) => run(`/micros/${id}/disembark`),
        setMax: (id, max) => run(`/micros/${id}/max`, "PATCH", { max }),
        startEmergency: (id) => run(`/micros/${id}/emergency`),
        resolveEmergency: (id) => run(`/micros/${id}/emergency/resolve`),
        emergencyTransfer: (id, rescueId) =>
          run(`/micros/${id}/emergency/transfer`, "POST", { rescueId }),
        restTransfer: (id, toId, creditedTo) =>
          run(`/micros/${id}/rest-transfer`, "POST", { toId, creditedTo }),
        resumeService: (id) => run(`/micros/${id}/resume`),
        dismissAlert: (id) => run(`/alerts/${id}`, "DELETE"),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function nearbyBuses(buses: Bus[], center: LatLng, km: number, excludeId?: string) {
  return buses
    .filter((b) => b.status === "activo" && b.id !== excludeId && !b.stale)
    .map((b) => ({ bus: b, km: haversineKm(center, b.pos) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}

export { newKey };
