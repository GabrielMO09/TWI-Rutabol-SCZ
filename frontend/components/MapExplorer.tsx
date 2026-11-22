"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, Clock, LocateFixed, Navigation, Radio, SignalZero, Ticket, TriangleAlert } from "lucide-react";
import MapView from "@/components/MapView";
import OccBadge from "@/components/OccBadge";
import { useFetch } from "@/lib/api";
import { PLAZA, RADIUS_KM, TICK_MS, haversineKm, type LatLng } from "@/lib/data";
import type { Stop } from "@/lib/routes";
import { useApp, type Bus } from "@/lib/store";

interface NearbyItem {
  bus: Bus;
  distanceKm: number;
  etaMin: number | null;
  etaReliable: boolean;
}
interface Nearby {
  radiusKm: number;
  items: NearbyItem[];
}

const INCIDENT_LABEL = {
  accidente: "Accidente",
  "falla-mecanica": "Falla mecánica",
  bloqueo: "Bloqueo",
  averia: "Avería",
  otro: "Incidencia",
} as const;

function ago(ms?: number) {
  if (!ms) return "sin dato";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

/** Mapa de consulta: lo usan el visitante sin cuenta (mode "public") y el pasajero (mode "pasajero"). */
export default function MapExplorer({ mode }: { mode: "public" | "pasajero" }) {
  const { world, lines, linesError, paths, selectedBusId, selectBus } = useApp();
  const [gps, setGps] = useState<LatLng>(PLAZA);
  const [ref, setRef] = useState("plaza");
  const [line, setLine] = useState("");
  const [direction, setDirection] = useState("");
  const [text, setText] = useState("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const references = useMemo(() => [
    { id: "plaza", label: "Plaza 24 de Septiembre", pos: PLAZA },
    ...lines.flatMap((entry) => {
      const pos = entry.waypoints.at(-1);
      return pos ? [{ id: `line:${entry.id}`, label: `Final de ${entry.name}`, pos }] : [];
    }),
  ], [lines]);
  const reference = references.find((entry) => entry.id === ref) ?? references[0];
  const user = ref === "" ? gps : reference.pos;
  const chosenLine = lines.find((entry) => entry.id === line);
  const lineId = chosenLine?.id ?? "";
  const lineIds = useMemo(() => new Set(lines.map((entry) => entry.id)), [lines]);

  const q = new URLSearchParams({ lat: String(user[0]), lng: String(user[1]), radiusKm: String(RADIUS_KM) });
  if (lineId) q.set("line", lineId);
  if (direction) q.set("direction", direction);
  const { data, error, loading } = useFetch<Nearby>(`/public/nearby?${q}`, TICK_MS);
  const { data: stops, error: stopsError } = useFetch<Stop[]>("/public/stops", 15000);

  const items = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (data?.items ?? [])
      .filter(({ bus }) => (!lineId || bus.line === lineId) && (!direction || bus.direction === direction))
      .map((it) => ({ ...it, bus: world.buses.find((b) => b.id === it.bus.id) ?? it.bus }))
      .filter((it) => !t || `${it.bus.line} ${it.bus.internal} ${it.bus.plate ?? ""}`.toLowerCase().includes(t));
  }, [data, world.buses, text, lineId, direction]);

  const buses = items.map((i) => i.bus);
  const selected = buses.find((b) => b.id === selectedBusId) ?? null;
  const routeLine = lineId || selected?.line;
  const routePath = routeLine ? paths[routeLine] : undefined;
  const visibleStops = useMemo(() => (stops ?? []).filter(
    (stop) => lineIds.has(stop.line) && (!routeLine || stop.line === routeLine),
  ), [stops, lineIds, routeLine]);
  const noSignal = world.buses.filter((b) => b.stale && (!lineId || b.line === lineId));
  const incidents = world.incidents.filter((i) => i.status !== "resuelto");
  const temp = world.tickets.find((t) => t.status === "pase-temporal");

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Tu navegador no permite geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here: LatLng = [p.coords.latitude, p.coords.longitude];
        if (haversineKm(here, PLAZA) > 30) {
          setGeoMsg("Estás fuera de Santa Cruz; se usa la Plaza 24 de Septiembre como referencia.");
          return;
        }
        setGps(here);
        setRef("");
        setGeoMsg(null);
      },
      () => setGeoMsg("No se pudo obtener tu ubicación. Elige un punto de referencia."),
      { timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {temp && (
        <div className="card flex items-start gap-3 border-brand bg-soft p-3 text-sm">
          <Ticket size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>
            Tienes un pase temporal hacia la unidad <strong>{temp.transferredTo}</strong>. Abórdala sin pagar de nuevo.
          </p>
        </div>
      )}
      {incidents.length > 0 && (
        <div role="status" className="card flex flex-col gap-1 border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <TriangleAlert size={16} />
            Incidencias en el servicio
          </p>
          {incidents.map((i) => (
            <p key={i.id}>
              Línea {i.line} / Interno {i.internal}: {INCIDENT_LABEL[i.type]} ({i.status === "reportado" ? "reportado" : "en atención"}).
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="order-2 flex flex-col gap-3 lg:order-1" aria-labelledby="micros-h">
          <div className="flex items-center justify-between">
            <h1 id="micros-h" className="text-lg font-semibold">Micros a {RADIUS_KM} km</h1>
            <span className="chip bg-soft text-brand-dark">
              <Radio size={12} />
              Tiempo real
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label htmlFor="ref" className="label">Punto de referencia</label>
              <select
                id="ref"
                className="input"
                value={ref === "" ? "" : reference.id}
                onChange={(e) => setRef(e.target.value)}
              >
                {ref === "" && <option value="">Mi ubicación</option>}
                {references.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="line" className="label">Línea</label>
              <select id="line" className="input" value={lineId} onChange={(e) => {
                setLine(e.target.value);
                selectBus(null);
              }}>
                <option value="">Todas</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dir" className="label">Sentido</label>
              <select id="dir" className="input" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="">Ambos</option>
                <option value="ida">Ida</option>
                <option value="vuelta">Vuelta</option>
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="q" className="label">Buscar por línea o interno</label>
              <input id="q" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. 17 o 045" />
            </div>
          </div>

          <button className="btn btn-outline" onClick={locate}>
            <LocateFixed size={16} />
            Usar mi ubicación
          </button>
          {geoMsg && <p className="text-xs text-muted">{geoMsg}</p>}
          {linesError && <p role="alert" className="text-sm text-danger">Líneas: {linesError}</p>}
          {stopsError && <p role="alert" className="text-sm text-danger">Paradas: {stopsError}</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {chosenLine && (
            <p className="text-sm font-medium">
              {routePath && routePath.length > 1
                ? `Recorrido de ${chosenLine.name}`
                : `${chosenLine.name} · Recorrido sin geometría disponible`}
            </p>
          )}

          <ul className="flex max-h-[40dvh] flex-col gap-2 overflow-y-auto pr-1">
            {loading && <li className="text-sm text-muted">Buscando micros...</li>}
            {!loading && items.length === 0 && !error && (
              <li className="text-sm text-muted">No hay micros activos con señal en tu radio.</li>
            )}
            {items.map(({ bus, distanceKm, etaMin, etaReliable }) => {
              const active = bus.id === selectedBusId;
              const full = bus.occupancy >= bus.max;
              return (
                <li key={bus.id} className={`card p-3 ${active ? "border-brand bg-soft" : ""}`}>
                  <button onClick={() => selectBus(active ? null : bus.id)} className="w-full text-left" aria-pressed={active}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        Línea {bus.line} · Interno {bus.internal}
                      </span>
                      <OccBadge occupancy={bus.occupancy} max={bus.max} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted">
                      <span>
                        {bus.occupancy}/{bus.max} pasajeros{bus.direction ? ` · ${bus.direction}` : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation size={12} />
                        {distanceKm.toFixed(1)} km
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {etaMin === null ? "ETA no disponible" : `Llega en ~${Math.max(1, Math.round(etaMin))} min${etaReliable ? "" : " (poco fiable)"}`}
                      </span>
                      <span>Señal {ago(bus.lastSeen)}</span>
                    </div>
                  </button>
                  {active && (
                    <div className="mt-3 flex flex-col gap-1 text-sm">
                      {bus.plate && <p className="text-muted">Placa {bus.plate} · Fuente {bus.source === "gps" ? "GPS del chofer" : "simulada"}</p>}
                      {full ? (
                        <p className="flex items-center gap-2 font-medium text-danger">
                          <Ban size={16} />
                          Unidad llena: no admite más pasajeros.
                        </p>
                      ) : mode === "pasajero" ? (
                        <Link href="/pasajero/pago" className="btn btn-primary w-full">
                          Pagar pasaje en esta unidad
                        </Link>
                      ) : (
                        <Link href="/acceso/pasajero" className="btn btn-outline w-full">
                          Inicia sesión para pagar
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {noSignal.length > 0 && (
            <div className="rounded-lg bg-soft p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <SignalZero size={16} />
                Unidades sin señal
              </p>
              <p className="text-muted">
                {noSignal.map((b) => `Línea ${b.line} / ${b.internal}`).join(", ")}. Su última ubicación no se muestra.
              </p>
            </div>
          )}
          <p className="text-xs text-muted">
            Mapa de OpenStreetMap y rutas con OSRM. Si el chofer no comparte GPS, la posición es simulada.
          </p>
        </section>

        <div className="order-1 h-[52dvh] overflow-hidden rounded-xl border border-line lg:order-2 lg:h-[calc(100dvh-210px)]">
          <MapView
            buses={buses}
            user={user}
            radiusKm={RADIUS_KM}
            selectedId={selected?.id ?? null}
            onSelect={(id) => selectBus(id)}
            routePath={routePath && routePath.length > 1 ? routePath : undefined}
            fitRoute={!!chosenLine && !selected}
            stops={visibleStops}
          />
        </div>
      </div>
    </div>
  );
}
