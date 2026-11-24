"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import {
  Ban, BusFront, Clock, LocateFixed, Navigation, PanelLeftClose, PanelLeftOpen, Radio,
  Search, SignalZero, SlidersHorizontal, Ticket, TriangleAlert,
} from "lucide-react";
import MapView from "@/components/MapView";
import OccBadge from "@/components/OccBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/pasajero/ui";
import { useNearby } from "@/components/pasajero/useNearby";
import { OCC_LABEL, RADIUS_KM, occState } from "@/lib/data";

type Nearby = ReturnType<typeof useNearby>;

const INCIDENT_LABEL = {
  accidente: "Accidente",
  "falla-mecanica": "Falla mecánica",
  bloqueo: "Bloqueo",
  averia: "Avería",
  otro: "Incidencia",
} as const;

const BAR = {
  disponible: "bg-(--psj-green)",
  moderado: "bg-[#4d7c0f]",
  "casi-lleno": "bg-(--psj-warn)",
  lleno: "bg-(--psj-danger)",
} as const;

function ago(ms?: number) {
  if (!ms) return "sin dato";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

function useDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true,
  );
}

function OccupancyBar({ occupancy, max }: { occupancy: number; max: number }) {
  const state = occState(occupancy, max);
  return (
    <div
      role="progressbar"
      aria-label={`Ocupación: ${OCC_LABEL[state]}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={occupancy}
      className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8eeea]"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${BAR[state]}`}
        style={{ width: `${Math.min(100, (occupancy / Math.max(1, max)) * 100)}%` }}
      />
    </div>
  );
}

function Panel({ n, onPick, onCollapse }: { n: Nearby; onPick: (id: string | null) => void; onCollapse?: () => void }) {
  const [filters, setFilters] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const { selectedBusId } = n;

  useEffect(() => {
    if (!selectedBusId) return;
    list.current?.querySelector(`[data-bus="${CSS.escape(selectedBusId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedBusId]);

  const activeFilters = [n.lineId, n.direction, n.ref !== "plaza" ? n.ref : ""].filter(Boolean).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1">
        <div>
          <h1 className="text-base font-semibold">Micros cercanos</h1>
          <p className="flex items-center gap-1 text-xs text-(--psj-muted-strong)">
            <Radio size={12} aria-hidden="true" className="text-(--psj-green)" />
            Tiempo real · radio {RADIUS_KM} km
          </p>
        </div>
        {onCollapse && (
          <button type="button" className="psj-icon-btn" aria-label="Ocultar panel" onClick={onCollapse}>
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--psj-muted)" />
          <input
            className="psj-input psj-input-icon"
            aria-label="Buscar por línea, interno o placa"
            value={n.text}
            onChange={(e) => n.setText(e.target.value)}
            placeholder="Línea o interno: 17, 045"
          />
        </div>
        <button
          type="button"
          className="psj-btn psj-btn-outline relative px-3"
          aria-expanded={filters}
          aria-label="Filtros"
          onClick={() => setFilters((o) => !o)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          {activeFilters > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--psj-green) px-1 text-xs text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {filters && (
        <div className="grid grid-cols-2 gap-3 border-y border-(--psj-line) bg-(--psj-bg) px-4 py-3">
          <div className="col-span-2">
            <label htmlFor="psj-ref" className="psj-label">Punto de referencia</label>
            <select
              id="psj-ref"
              className="psj-input"
              value={n.ref === "" ? "" : n.reference.id}
              onChange={(e) => n.setRef(e.target.value)}
            >
              {n.ref === "" && <option value="">Mi ubicación</option>}
              {n.references.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="psj-line" className="psj-label">Línea</label>
            <select
              id="psj-line"
              className="psj-input"
              value={n.lineId}
              onChange={(e) => {
                n.setLine(e.target.value);
                onPick(null);
              }}
            >
              <option value="">Todas</option>
              {n.lines.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="psj-radius" className="psj-label">Radio de búsqueda</label>
            <select id="psj-radius" className="psj-input" disabled aria-describedby="psj-radius-note" value="5">
              <option value="5">{RADIUS_KM} km</option>
            </select>
          </div>
          <p id="psj-radius-note" className="col-span-2 -mt-1 text-xs text-(--psj-muted-strong)">
            El radio es fijo por ahora; se podrá ajustar cuando el servicio lo permita.
          </p>
          <div className="col-span-2">
            <span className="psj-label">Sentido</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#e8eeea] p-1">
              {[["", "Ambos"], ["ida", "Ida"], ["vuelta", "Vuelta"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={n.direction === value}
                  onClick={() => n.setDirection(value)}
                  className={`min-h-9 rounded-md text-sm font-medium transition-colors ${
                    n.direction === value ? "bg-(--psj-surface) text-(--psj-green-dark) shadow-sm" : "text-(--psj-muted-strong)"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="psj-btn psj-btn-outline col-span-2" onClick={n.locate}>
            <LocateFixed size={16} aria-hidden="true" />
            Usar mi ubicación
          </button>
          {n.geoMsg && <p className="col-span-2 text-xs text-(--psj-muted-strong)">{n.geoMsg}</p>}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {n.temp && (
          <div className="flex items-start gap-2 rounded-lg bg-(--psj-green-soft) p-3 text-sm">
            <Ticket size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-(--psj-green)" />
            <p>
              Tienes un pase temporal hacia la unidad <strong>{n.temp.transferredTo}</strong>. Abórdala sin pagar de nuevo.
            </p>
          </div>
        )}
        {n.incidents.length > 0 && (
          <div role="status" className="flex flex-col gap-1 rounded-lg bg-(--psj-warn-soft) p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-[#92400e]">
              <TriangleAlert size={16} aria-hidden="true" />
              Incidencias en el servicio
            </p>
            {n.incidents.map((i) => (
              <p key={i.id}>
                Línea {i.line} / Interno {i.internal}: {INCIDENT_LABEL[i.type]} ({i.status === "reportado" ? "reportado" : "en atención"}).
              </p>
            ))}
          </div>
        )}
        {(n.linesError || n.stopsError) && (
          <ErrorState message="No pudimos actualizar líneas o paradas. El mapa puede estar desactualizado." onRetry={n.reload} />
        )}
        {n.error && <ErrorState message="No pudimos buscar micros cercanos. Revisa tu conexión." onRetry={n.reload} />}
        {n.chosenLine && (
          <p className="text-sm font-medium">
            {n.routePath ? `Recorrido de ${n.chosenLine.name}` : `${n.chosenLine.name} · recorrido sin geometría disponible`}
          </p>
        )}

        <ul ref={list} className="flex flex-col gap-2" aria-label="Micros cercanos">
          {n.loading && n.items.length === 0 &&
            [0, 1, 2].map((i) => (
              <li key={i} className="psj-card flex flex-col gap-2 p-3" aria-hidden="true">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-1.5 w-full" />
              </li>
            ))}
          {!n.loading && n.items.length === 0 && !n.error && (
            <li>
              <EmptyState icon={BusFront} title="Sin micros en tu radio">
                No hay unidades activas con señal cerca de este punto. Prueba con otra referencia o línea.
              </EmptyState>
            </li>
          )}
          {n.items.map(({ bus, distanceKm, etaMin, etaReliable }) => {
            const active = bus.id === n.selectedBusId;
            const full = bus.occupancy >= bus.max;
            return (
              <li key={bus.id} data-bus={bus.id} className={`psj-card transition-colors ${active ? "border-(--psj-green) bg-(--psj-green-soft)" : ""}`}>
                <button type="button" onClick={() => onPick(active ? null : bus.id)} aria-pressed={active} className="w-full p-3 text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--psj-green) text-sm font-bold text-white">
                      {bus.line}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">Línea {bus.line} · Interno {bus.internal}</p>
                      <p className="flex items-center gap-2 text-xs text-(--psj-muted-strong)">
                        <span className="flex items-center gap-1">
                          <Navigation size={12} aria-hidden="true" />
                          {distanceKm.toFixed(1)} km
                        </span>
                        {bus.direction && <span className="capitalize">{bus.direction}</span>}
                      </p>
                    </div>
                    <OccBadge occupancy={bus.occupancy} max={bus.max} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <OccupancyBar occupancy={bus.occupancy} max={bus.max} />
                    <span className="shrink-0 text-xs text-(--psj-muted-strong)">{bus.occupancy}/{bus.max}</span>
                  </div>
                  <p className="mt-2 flex items-center justify-between text-xs text-(--psj-muted-strong)">
                    <span className="flex items-center gap-1">
                      <Clock size={12} aria-hidden="true" />
                      {etaMin === null ? "ETA no disponible" : `Llega en ~${Math.max(1, Math.round(etaMin))} min${etaReliable ? "" : " (poco fiable)"}`}
                    </span>
                    <span>Señal {ago(bus.lastSeen)}</span>
                  </p>
                </button>
                {active && (
                  <div className="flex flex-col gap-2 border-t border-(--psj-line) p-3 text-sm">
                    {bus.plate && (
                      <p className="text-(--psj-muted-strong)">
                        Placa {bus.plate} · Fuente {bus.source === "gps" ? "GPS del chofer" : "simulada"}
                      </p>
                    )}
                    {full ? (
                      <p className="flex items-center gap-2 font-medium text-(--psj-danger)">
                        <Ban size={16} aria-hidden="true" />
                        Unidad llena: no admite más pasajeros.
                      </p>
                    ) : (
                      <Link href="/pasajero/pago" className="psj-btn psj-btn-primary w-full">
                        Pagar pasaje en esta unidad
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {n.noSignal.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-(--psj-bg) p-3 text-sm">
            <SignalZero size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="text-(--psj-muted-strong)">
              Sin señal: {n.noSignal.map((b) => `Línea ${b.line} / ${b.internal}`).join(", ")}. Su última ubicación no se muestra.
            </p>
          </div>
        )}
        <p className="text-xs text-(--psj-muted-strong)">
          Mapa de OpenStreetMap y rutas con OSRM. Si el chofer no comparte GPS, la posición es simulada.
        </p>
      </div>
    </div>
  );
}

const PEEK = 148;
const FRACTION = [0, 0.46, 0.86];

/** Hoja inferior arrastrable con tres alturas: mínima, media y casi completa. */
function MobileSheet({ snap, setSnap, children }: { snap: number; setSnap: (s: number) => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number } | null>(null);
  const moved = useRef(false);

  const total = () => box.current?.parentElement?.clientHeight ?? 600;
  const heights = () => [PEEK, ...FRACTION.slice(1).map((f) => total() * f)];

  function down(e: PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: box.current?.offsetHeight ?? PEEK };
    moved.current = false;
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const dy = start.current.y - e.clientY;
    if (Math.abs(dy) > 4) moved.current = true;
    if (moved.current) setDrag(Math.max(PEEK, Math.min(total() * 0.9, start.current.h + dy)));
  }
  function up() {
    if (start.current && moved.current && drag !== null) {
      const hs = heights();
      setSnap(hs.reduce((best, h, i) => (Math.abs(h - drag) < Math.abs(hs[best] - drag) ? i : best), 0));
    }
    start.current = null;
    setDrag(null);
  }

  const height = drag ?? (snap === 0 ? PEEK : `${FRACTION[snap] * 100}%`);
  return (
    <div
      ref={box}
      data-dragging={drag !== null}
      className="psj-sheet-map psj-card absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-b-none border-b-0 shadow-[0_-4px_16px_rgb(16_62_44/0.12)]"
      style={{ height }}
    >
      <button
        type="button"
        aria-label={snap === 2 ? "Reducir lista de micros" : "Ampliar lista de micros"}
        className="flex h-8 w-full shrink-0 touch-none items-center justify-center"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          setSnap(snap === 2 ? 0 : snap + 1);
        }}
      >
        <span className="h-1.5 w-10 rounded-full bg-(--psj-line)" />
      </button>
      {children}
    </div>
  );
}

export default function PasajeroMap() {
  const n = useNearby();
  const desktop = useDesktop();
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState(1);

  function pick(id: string | null) {
    n.selectBus(id);
    if (id) {
      setOpen(true);
      if (snap === 0) setSnap(1);
    }
  }

  const inset = desktop || typeof window === "undefined" ? 0 : snap === 0 ? PEEK : snap === 1 ? Math.round(window.innerHeight * 0.4) : 0;

  return (
    <div className="psj-map-page isolate overflow-hidden">
      <div className="absolute inset-0 isolate">
        <MapView
          buses={n.buses}
          user={n.user}
          radiusKm={RADIUS_KM}
          selectedId={n.selected?.id ?? null}
          onSelect={pick}
          routePath={n.routePath}
          fitRoute={!!n.chosenLine && !n.selected}
          stops={n.visibleStops}
          cluster
          bottomInset={inset}
        />
      </div>

      {desktop ? (
        open ? (
          <aside aria-label="Micros cercanos" className="psj-card psj-card-shadow absolute bottom-4 left-4 top-4 z-10 flex w-[380px] max-w-[calc(100%-2rem)] flex-col overflow-hidden pt-3">
            <Panel n={n} onPick={pick} onCollapse={() => setOpen(false)} />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="psj-btn psj-btn-outline psj-card-shadow absolute left-4 top-4 z-10"
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
            Ver micros ({n.items.length})
          </button>
        )
      ) : (
        <MobileSheet snap={snap} setSnap={setSnap}>
          <Panel n={n} onPick={pick} />
        </MobileSheet>
      )}
    </div>
  );
}
