"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_STUDENT,
  DRIVERS,
  FARES,
  FLEET,
  LINES,
  TICK_MS,
  haversineKm,
  sha256,
  type Category,
  type LatLng,
} from "./data";
import { fetchLinePath, roundTrip } from "./routes";

export type Role = "pasajero" | "chofer";
export type BusStatus = "activo" | "descanso" | "emergencia";

export interface Profile {
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
  max: number;
  occupancy: number;
  progress: number;
  pos: LatLng;
  status: BusStatus;
}
export interface Ticket {
  id: string;
  busId: string;
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
  code: string;
  fromBus: string;
  toBus: string;
  expires: number;
}
export interface Alert {
  id: string;
  busId: string;
  at: number;
}
interface World {
  buses: Bus[];
  tickets: Ticket[];
  reqs: BoardingReq[];
  ledger: LedgerEntry[];
  passes: Pass[];
  alerts: Alert[];
}
interface StoredUser {
  password: string;
  profile: Profile;
}
export interface RegisterData {
  name: string;
  category: Category;
  code: string;
  password: string;
  photo: string;
}

const SESSION_KEY = "rutabol-session";
const TICKETS_KEY = "rutabol-tickets";
const USERS_KEY = "rutabol-users";
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
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
function initialWorld(paths: Record<string, LatLng[]>): World {
  return {
    buses: FLEET.map((f) => ({
      id: `${f.line}-${f.internal}`,
      line: f.line,
      internal: f.internal,
      max: f.max,
      occupancy: f.occ,
      progress: f.progress,
      pos: posAt(paths[f.line], f.progress),
      status: "activo" as BusStatus,
    })),
    tickets: [],
    reqs: [],
    ledger: [],
    passes: [],
    alerts: [],
  };
}

interface AppCtx {
  ready: boolean;
  profile: Profile | null;
  world: World;
  paths: Record<string, LatLng[]>;
  selectedBusId: string | null;
  selectBus: (id: string | null) => void;
  logout: () => void;
  registerStudent: (d: RegisterData) => Promise<string | null>;
  loginPassenger: (id: string, password: string) => Promise<string | null>;
  loginDriver: (line: string, internal: string, pin: string) => string | null;
  payTicket: (busId: string, method: string) => { error?: string; ticket?: Ticket };
  validateBoarding: (reqId: string, accept: boolean) => string | null;
  registerDisembark: (busId: string) => void;
  setMax: (busId: string, max: number) => string | null;
  startEmergency: (busId: string) => void;
  resolveEmergency: (busId: string) => void;
  emergencyTransfer: (busId: string, rescueId: string) => string | null;
  restTransfer: (
    busId: string,
    toId: string,
    creditedTo: "descanso" | "saliente",
  ) => string | null;
  resumeService: (busId: string) => void;
  dismissAlert: (id: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fuera de AppProvider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paths, setPaths] = useState(initialPaths);
  const [world, setWorld] = useState<World>(() => initialWorld(initialPaths()));
  const [selectedBusId, selectBus] = useState<string | null>(null);
  const worldRef = useRef(world);
  const pathsRef = useRef(paths);

  const commit = (w: World) => {
    worldRef.current = w;
    setWorld(w);
  };
  const update = (fn: (w: World) => World) => commit(fn(worldRef.current));
  const mapBus = (w: World, id: string, fn: (b: Bus) => Bus): World => ({
    ...w,
    buses: w.buses.map((b) => (b.id === id ? fn(b) : b)),
  });

  useEffect(() => {
    const saved = loadJson<Profile | null>(SESSION_KEY, null);
    const tickets = loadJson<Ticket[]>(TICKETS_KEY, []);
    if (saved) setProfile(saved);
    if (tickets.length) update((w) => ({ ...w, tickets }));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveJson(TICKETS_KEY, world.tickets);
  }, [ready, world.tickets]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      LINES.map(async (l) => [l.id, await fetchLinePath(l)] as const),
    ).then((res) => {
      if (cancelled) return;
      const next = { ...pathsRef.current };
      for (const [id, p] of res) if (p) next[id] = p;
      pathsRef.current = next;
      setPaths(next);
      update((w) => ({
        ...w,
        buses: w.buses.map((b) => ({ ...b, pos: posAt(next[b.line], b.progress) })),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cada tick mueve los micros activos a lo largo de su linea (RNF-01: 3 a 5 s).
  useEffect(() => {
    const id = setInterval(() => {
      update((w) => ({
        ...w,
        buses: w.buses.map((b) => {
          if (b.status !== "activo") return b;
          const progress = (b.progress + 0.003) % 1;
          let occupancy = b.occupancy;
          if (b.id !== profileBusId.current && Math.random() < 0.25) {
            occupancy = Math.max(0, Math.min(b.max, occupancy + (Math.random() < 0.5 ? -1 : 1)));
          }
          return { ...b, progress, occupancy, pos: posAt(pathsRef.current[b.line], progress) };
        }),
      }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const profileBusId = useRef<string | undefined>(undefined);
  profileBusId.current = profile?.busId;

  const startSession = (p: Profile) => {
    setProfile(p);
    saveJson(SESSION_KEY, p);
  };

  const logout = () => {
    setProfile(null);
    selectBus(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  const registerStudent: AppCtx["registerStudent"] = async (d) => {
    const code = d.code.trim();
    const key = code.toLowerCase();
    if (d.name.trim().length < 3) return "Ingresa tu nombre completo.";
    if (d.category === "universitario" && !/^[^@\s]+@upds\.edu\.bo$/i.test(code))
      return "Usa tu correo institucional @upds.edu.bo.";
    if (d.category === "escolar" && !/^[A-Za-z0-9]{8,20}$/.test(code))
      return "El código RUDE debe tener entre 8 y 20 caracteres.";
    if (d.category === "general" && code.length < 5) return "Ingresa un número de CI válido.";
    if (!d.photo) return "La fotografía del rostro es obligatoria para el carnet digital.";
    if (d.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    const users = loadJson<Record<string, StoredUser>>(USERS_KEY, {});
    if (users[key]) return "Ya existe una cuenta con ese identificador.";
    const profile: Profile = {
      role: "pasajero",
      name: d.name.trim(),
      category: d.category,
      code,
      photo: d.photo,
    };
    users[key] = { password: await sha256(d.password), profile };
    saveJson(USERS_KEY, users);
    startSession(profile);
    return null;
  };

  const loginPassenger: AppCtx["loginPassenger"] = async (id, password) => {
    const key = id.trim().toLowerCase();
    const users = loadJson<Record<string, StoredUser>>(USERS_KEY, {});
    if (!users[key] && key === DEMO_STUDENT.id) {
      users[key] = {
        password: await sha256(DEMO_STUDENT.password),
        profile: {
          role: "pasajero",
          name: DEMO_STUDENT.name,
          category: "universitario",
          code: DEMO_STUDENT.id,
        },
      };
      saveJson(USERS_KEY, users);
    }
    const u = users[key];
    if (!u || u.password !== (await sha256(password))) return "Identificador o contraseña incorrectos.";
    startSession(u.profile);
    return null;
  };

  const loginDriver: AppCtx["loginDriver"] = (line, internal, pin) => {
    const d = DRIVERS.find((x) => x.line === line && x.internal === internal.trim());
    if (!d) return "Esa línea y número interno no tienen una asignación de la administracion.";
    if (d.pin !== pin) return "PIN incorrecto.";
    const busId = `${d.line}-${d.internal}`;
    startSession({ role: "chofer", name: d.name, line: d.line, internal: d.internal, busId });
    update((w) => {
      if (w.reqs.some((r) => r.busId === busId)) return w;
      const seed: Omit<BoardingReq, "id" | "busId">[] = [
        { name: "Mariana Rojas", category: "universitario", code: "mariana.rojas@upds.edu.bo", fare: FARES.universitario },
        { name: "Diego Salvatierra", category: "escolar", code: "RUDE80480123", fare: FARES.escolar },
        { name: "Lucía Vaca", category: "universitario", code: "lucia.vaca@upds.edu.bo", fare: FARES.universitario },
      ];
      return { ...w, reqs: [...w.reqs, ...seed.map((s) => ({ ...s, id: uid(), busId }))] };
    });
    return null;
  };

  const payTicket: AppCtx["payTicket"] = (busId, method) => {
    const w = worldRef.current;
    const bus = w.buses.find((b) => b.id === busId);
    if (!profile || profile.role !== "pasajero") return { error: "Inicia sesión como pasajero." };
    if (!bus || bus.status !== "activo") return { error: "La unidad no está disponible." };
    const pending = w.reqs.filter((r) => r.busId === busId).length;
    if (bus.occupancy + pending >= bus.max) return { error: "La unidad está llena. Elige otro micro." };
    const category = profile.category ?? "general";
    const ticket: Ticket = {
      id: `T-${uid()}`,
      busId,
      fare: FARES[category],
      category,
      method,
      at: Date.now(),
      status: "pagado",
    };
    const req: BoardingReq = {
      id: uid(),
      busId,
      ticketId: ticket.id,
      name: profile.name,
      category,
      code: profile.code ?? "",
      photo: profile.photo,
      fare: ticket.fare,
    };
    update((x) => ({ ...x, tickets: [ticket, ...x.tickets], reqs: [...x.reqs, req] }));
    return { ticket };
  };

  const validateBoarding: AppCtx["validateBoarding"] = (reqId, accept) => {
    const w = worldRef.current;
    const req = w.reqs.find((r) => r.id === reqId);
    if (!req) return null;
    const bus = w.buses.find((b) => b.id === req.busId);
    if (accept && bus && bus.occupancy >= bus.max)
      return "Unidad llena: admisión bloqueada.";
    update((x) => {
      let nx: World = {
        ...x,
        reqs: x.reqs.filter((r) => r.id !== reqId),
        tickets: x.tickets.map((t) =>
          t.id === req.ticketId ? { ...t, status: accept ? "abordado" : "rechazado" } : t,
        ),
      };
      if (accept) nx = mapBus(nx, req.busId, (b) => ({ ...b, occupancy: b.occupancy + 1 }));
      return nx;
    });
    return null;
  };

  const registerDisembark: AppCtx["registerDisembark"] = (busId) =>
    update((w) => mapBus(w, busId, (b) => ({ ...b, occupancy: Math.max(0, b.occupancy - 1) })));

  const setMax: AppCtx["setMax"] = (busId, max) => {
    if (max < 18 || max > 25) return "El aforo debe estar entre 18 y 25 pasajeros.";
    const bus = worldRef.current.buses.find((b) => b.id === busId);
    if (bus && max < bus.occupancy) return "El aforo no puede ser menor a los pasajeros a bordo.";
    update((w) => mapBus(w, busId, (b) => ({ ...b, max })));
    return null;
  };

  const startEmergency: AppCtx["startEmergency"] = (busId) =>
    update((w) => ({
      ...mapBus(w, busId, (b) => ({ ...b, status: "emergencia" })),
      alerts: [{ id: uid(), busId, at: Date.now() }, ...w.alerts],
    }));

  const resolveEmergency: AppCtx["resolveEmergency"] = (busId) =>
    update((w) => ({
      ...mapBus(w, busId, (b) => ({ ...b, status: "activo" })),
      alerts: w.alerts.filter((a) => a.busId !== busId),
    }));

  const emergencyTransfer: AppCtx["emergencyTransfer"] = (busId, rescueId) => {
    const w = worldRef.current;
    const bus = w.buses.find((b) => b.id === busId);
    const rescue = w.buses.find((b) => b.id === rescueId);
    if (!bus || !rescue) return "Unidad no encontrada.";
    const moved = Math.min(bus.occupancy, rescue.max - rescue.occupancy);
    if (moved <= 0) return "La unidad de rescate no tiene cupo.";
    const passes: Pass[] = Array.from({ length: moved }, () => ({
      id: uid(),
      code: `TMP-${uid()}`,
      fromBus: busId,
      toBus: rescueId,
      expires: Date.now() + 60 * 60 * 1000,
    }));
    let left = moved;
    update((x) => ({
      ...mapBus(mapBus(x, busId, (b) => ({ ...b, occupancy: b.occupancy - moved })), rescueId, (b) => ({
        ...b,
        occupancy: b.occupancy + moved,
      })),
      passes: [...passes, ...x.passes],
      tickets: x.tickets.map((t) => {
        if (t.busId === busId && left > 0 && (t.status === "pagado" || t.status === "abordado")) {
          left--;
          return { ...t, status: "pase-temporal", transferredTo: rescueId };
        }
        return t;
      }),
    }));
    return null;
  };

  const restTransfer: AppCtx["restTransfer"] = (busId, toId, creditedTo) => {
    const w = worldRef.current;
    const bus = w.buses.find((b) => b.id === busId);
    const to = w.buses.find((b) => b.id === toId);
    if (!bus || !to) return "Selecciona la unidad saliente.";
    if (bus.occupancy > to.max - to.occupancy) return "La unidad saliente no tiene cupo para todos los pasajeros.";
    const amount = bus.occupancy * FARES.general;
    update((x) => ({
      ...mapBus(mapBus(x, busId, (b) => ({ ...b, occupancy: 0, status: "descanso" })), toId, (b) => ({
        ...b,
        occupancy: b.occupancy + bus.occupancy,
      })),
      ledger: [
        { id: uid(), at: Date.now(), fromBus: busId, toBus: toId, passengers: bus.occupancy, amount, creditedTo },
        ...x.ledger,
      ],
    }));
    return null;
  };

  const resumeService: AppCtx["resumeService"] = (busId) =>
    update((w) => mapBus(w, busId, (b) => ({ ...b, status: "activo" })));

  const dismissAlert: AppCtx["dismissAlert"] = (id) =>
    update((w) => ({ ...w, alerts: w.alerts.filter((a) => a.id !== id) }));

  return (
    <Ctx.Provider
      value={{
        ready,
        profile,
        world,
        paths,
        selectedBusId,
        selectBus,
        logout,
        registerStudent,
        loginPassenger,
        loginDriver,
        payTicket,
        validateBoarding,
        registerDisembark,
        setMax,
        startEmergency,
        resolveEmergency,
        emergencyTransfer,
        restTransfer,
        resumeService,
        dismissAlert,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function nearbyBuses(buses: Bus[], center: LatLng, km: number, excludeId?: string) {
  return buses
    .filter((b) => b.status === "activo" && b.id !== excludeId)
    .map((b) => ({ bus: b, km: haversineKm(center, b.pos) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}
