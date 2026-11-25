
"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  Ban,
  BusFront,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RefreshCw,
  Search,
  SignalZero,
  SlidersHorizontal,
  Ticket,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

import MapView from "@/components/MapView";
import OccBadge from "@/components/OccBadge";

import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/pasajero/ui";

import { useNearby } from "@/components/pasajero/useNearby";

import {
  OCC_LABEL,
  RADIUS_KM,
  occState,
} from "@/lib/data";

/* =========================================
   TIPOS Y CONFIGURACIONES
========================================= */

type Nearby = ReturnType<typeof useNearby>;

const INCIDENT_LABEL = {
  accidente: "Accidente",
  "falla-mecanica": "Falla mecánica",
  bloqueo: "Bloqueo",
  averia: "Avería",
  otro: "Incidencia",
} as const;

const BAR = {
  disponible: "bg-emerald-500",
  moderado: "bg-lime-600",
  "casi-lleno": "bg-amber-500",
  lleno: "bg-red-500",
} as const;

const SELECT_STYLE =
  "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100";

const LABEL_STYLE =
  "mb-2 block text-xs font-semibold text-slate-600";

/* =========================================
   TIEMPO TRANSCURRIDO
========================================= */

function ago(ms?: number) {
  if (!ms) return "sin dato";

  const seconds = Math.max(
    0,
    Math.round((Date.now() - ms) / 1000)
  );

  return seconds < 60
    ? `hace ${seconds} s`
    : `hace ${Math.round(seconds / 60)} min`;
}

/* =========================================
   DETECTAR TAMAÑO DE PANTALLA
========================================= */

function subscribeDesktop(notify: () => void) {
  const query = window.matchMedia(
    "(min-width: 768px)"
  );

  query.addEventListener("change", notify);

  return () =>
    query.removeEventListener("change", notify);
}

function useDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () =>
      window.matchMedia(
        "(min-width: 768px)"
      ).matches,
    () => true
  );
}

/* =========================================
   BARRA DE OCUPACIÓN
========================================= */

function OccupancyBar({
  occupancy,
  max,
}: {
  occupancy: number;
  max: number;
}) {
  const state = occState(occupancy, max);

  const percent = Math.max(
    0,
    Math.min(
      100,
      (occupancy / Math.max(1, max)) * 100
    )
  );

  return (
    <div
      role="progressbar"
      aria-label={`Ocupación: ${OCC_LABEL[state]}`}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, max)}
      aria-valuenow={Math.max(
        0,
        Math.min(occupancy, Math.max(1, max))
      )}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${BAR[state]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/* =========================================
   INDICADORES DEL PANEL
========================================= */

function PanelStats({ n }: { n: Nearby }) {
  return (
    <div className="grid grid-cols-2 gap-3">

      {/* Micros cercanos */}

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">

        <div className="mb-2 flex items-center justify-between gap-2">

          <BusFront
            size={19}
            aria-hidden="true"
            className="text-emerald-700"
          />

          <span className="h-2 w-2 rounded-full bg-emerald-500" />

        </div>

        <p className="text-2xl font-extrabold tracking-tight text-emerald-950">

          {n.loading && !n.items.length
            ? "—"
            : n.items.length}

        </p>

        <p className="mt-1 text-xs font-medium text-emerald-700">
          Micros cercanos
        </p>

      </div>

      {/* Radio de búsqueda */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">

        <MapPin
          size={19}
          aria-hidden="true"
          className="mb-2 text-blue-700"
        />

        <p className="text-2xl font-extrabold tracking-tight text-blue-950">
          {RADIUS_KM} km
        </p>

        <p className="mt-1 text-xs font-medium text-blue-700">
          Radio de búsqueda
        </p>

      </div>

    </div>
  );
}

/* =========================================
   FILTROS DE BÚSQUEDA
========================================= */

function SearchFilters({
  n,
  onPick,
}: {
  n: Nearby;
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-2">

        <SlidersHorizontal
          size={16}
          aria-hidden="true"
          className="text-emerald-700"
        />

        <h2 className="text-sm font-bold text-slate-800">
          Configurar búsqueda
        </h2>

      </div>

      {/* Punto de referencia */}

      <div>

        <label
          htmlFor="psj-ref"
          className={LABEL_STYLE}
        >
          Punto de referencia
        </label>

        <select
          id="psj-ref"
          className={SELECT_STYLE}
          value={n.ref === "" ? "" : n.reference.id}
          onChange={(event) =>
            n.setRef(event.target.value)
          }
        >

          {n.ref === "" && (
            <option value="">
              Mi ubicación
            </option>
          )}

          {n.references.map((reference) => (
            <option
              key={reference.id}
              value={reference.id}
            >
              {reference.label}
            </option>
          ))}

        </select>

      </div>

      {/* Línea y radio */}

      <div className="grid grid-cols-2 gap-3">

        <div className="min-w-0">

          <label
            htmlFor="psj-line"
            className={LABEL_STYLE}
          >
            Línea
          </label>

          <select
            id="psj-line"
            className={SELECT_STYLE}
            value={n.lineId}
            onChange={(event) => {
              n.setLine(event.target.value);
              onPick(null);
            }}
          >

            <option value="">
              Todas
            </option>

            {n.lines.map((line) => (
              <option
                key={line.id}
                value={line.id}
              >
                {line.name}
              </option>
            ))}

          </select>

        </div>

        <div className="min-w-0">

          <label
            htmlFor="psj-radius"
            className={LABEL_STYLE}
          >
            Radio de búsqueda
          </label>

          <select
            id="psj-radius"
            disabled
            value={String(RADIUS_KM)}
            aria-describedby="psj-radius-note"
            className={SELECT_STYLE}
          >
            <option value={String(RADIUS_KM)}>
              {RADIUS_KM} km
            </option>
          </select>

        </div>

      </div>

      <p
        id="psj-radius-note"
        className="text-[11px] leading-relaxed text-slate-500"
      >
        El radio es fijo por ahora y podrá ajustarse
        cuando el servicio lo permita.
      </p>

      {/* Sentido del recorrido */}

      <div>

        <span className={LABEL_STYLE}>
          Sentido del recorrido
        </span>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-200/60 p-1">

          {[
            ["", "Ambos"],
            ["ida", "Ida"],
            ["vuelta", "Vuelta"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={n.direction === value}
              onClick={() =>
                n.setDirection(value)
              }
              className={`min-h-10 rounded-lg text-xs font-semibold transition-all ${
                n.direction === value
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}

        </div>

      </div>

      {/* Geolocalización */}

      <button
        type="button"
        onClick={n.locate}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
      >

        <LocateFixed
          size={18}
          aria-hidden="true"
        />

        Usar mi ubicación

      </button>

      {n.geoMsg && (
        <p
          role="status"
          className="text-xs leading-relaxed text-slate-500"
        >
          {n.geoMsg}
        </p>
      )}

    </div>
  );
}

/* =========================================
   TARJETA INDIVIDUAL DE MICRO
========================================= */

function BusCard({
  item,
  selected,
  onPick,
  guest,
}: {
  item: Nearby["items"][number];
  selected: boolean;
  onPick: (id: string | null) => void;
  guest: boolean;
}) {
  const {
    bus,
    distanceKm,
    etaMin,
    etaReliable,
  } = item;

  const full = bus.occupancy >= bus.max;

  return (
    <li
      data-bus={bus.id}
      className={`group min-w-0 overflow-hidden rounded-2xl border transition-all duration-200 ${
        selected
          ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-100"
          : "border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-md"
      }`}
    >

      <button
        type="button"
        onClick={() =>
          onPick(selected ? null : bus.id)
        }
        aria-pressed={selected}
        className="w-full min-w-0 p-3.5 text-left"
      >

        {/* Identificación de la unidad */}

        <div className="flex items-center gap-3">

          <span className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-700 to-emerald-900 px-2 text-base font-extrabold text-white shadow-sm">

            {bus.line}

          </span>

          <div className="min-w-0 flex-1">

            <p className="text-sm font-bold text-slate-900">
              Línea {bus.line}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Interno {bus.internal}
            </p>

          </div>

          <OccBadge
            occupancy={bus.occupancy}
            max={bus.max}
          />

        </div>

        {/* Distancia y sentido */}

        <div className="mt-3 flex flex-wrap items-center gap-2">

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">

            <Navigation
              size={13}
              aria-hidden="true"
              className="text-blue-600"
            />

            {distanceKm.toFixed(1)} km

          </span>

          {bus.direction && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium capitalize text-slate-600">

              {bus.direction}

            </span>
          )}

        </div>

        {/* Aforo */}

        <div className="mt-4">

          <div className="mb-2 flex items-center justify-between gap-2">

            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">

              <Users
                size={14}
                aria-hidden="true"
              />

              Ocupación actual

            </span>

            <span className="text-xs font-bold tabular-nums text-slate-700">

              {bus.occupancy}/{bus.max}

            </span>

          </div>

          <OccupancyBar
            occupancy={bus.occupancy}
            max={bus.max}
          />

        </div>

        {/* Tiempo de llegada */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">

          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">

            <Clock
              size={14}
              aria-hidden="true"
              className="text-emerald-600"
            />

            {etaMin === null
              ? "ETA no disponible"
              : `Llega en ~${Math.max(
                  1,
                  Math.round(etaMin)
                )} min`}

          </span>

          <span className="text-[10px] text-slate-500">

            Señal {ago(bus.lastSeen)}

          </span>

        </div>

        {etaMin !== null && !etaReliable && (
          <p className="mt-2 text-[11px] font-medium text-amber-700">

            Tiempo estimado poco fiable.

          </p>
        )}

      </button>

      {/* Información de la unidad seleccionada */}

      {selected && (
        <div className="animate-fade-in space-y-3 border-t border-emerald-100 bg-white/70 p-3.5">

          {bus.plate && (
            <p className="text-xs text-slate-600">

              Placa:{" "}

              <strong>{bus.plate}</strong>

            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">

            <Radio
              size={14}
              aria-hidden="true"
              className={
                bus.source === "gps"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />

            {bus.source === "gps"
              ? "Ubicación mediante GPS del chofer"
              : "Ubicación simulada"}

          </div>

          {full ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium leading-relaxed text-red-700">

              <Ban
                size={17}
                aria-hidden="true"
                className="shrink-0"
              />

              Unidad llena: no admite más pasajeros.

            </div>
          ) : (
            <Link
              href={
                guest
                  ? "/acceso/pasajero"
                  : "/pasajero/pago"
              }
              className="group/payment flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-3 text-center text-xs font-bold text-white transition-colors hover:bg-emerald-900"
            >

              <Ticket
                size={17}
                aria-hidden="true"
              />

              {guest
                ? "Inicia sesión para pagar"
                : "Pagar pasaje en esta unidad"}

              <ArrowRight
                size={16}
                aria-hidden="true"
                className="shrink-0 transition-transform group-hover/payment:translate-x-1"
              />

            </Link>
          )}

        </div>
      )}

    </li>
  );
}

/* =========================================
   PANEL PRINCIPAL DE MICROS
========================================= */

function Panel({
  n,
  onPick,
  onCollapse,
  guest = false,
  compact = false,
  onExpand,
}: {
  n: Nearby;
  onPick: (id: string | null) => void;
  onCollapse?: () => void;
  guest?: boolean;
  compact?: boolean;
  onExpand?: () => void;
}) {
  const [filters, setFilters] = useState(false);

  const list = useRef<HTMLUListElement>(null);

  const { selectedBusId } = n;

  useEffect(() => {
    if (!selectedBusId) return;

    list.current
      ?.querySelector(
        `[data-bus="${CSS.escape(selectedBusId)}"]`
      )
      ?.scrollIntoView({
        block: "nearest",
      });

  }, [selectedBusId, compact]);

  const activeFilters = [
    n.lineId,
    n.direction,
    n.ref !== "plaza" ? n.ref : "",
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">

      {/* =================================
          ENCABEZADO DEL PANEL
      ================================= */}

      <div className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-2">

        <div className="flex items-center justify-between gap-3">

          <div className="flex min-w-0 items-center gap-3">

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

              <BusFront
                size={23}
                aria-hidden="true"
              />

            </span>

            <div className="min-w-0">

              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Micros cercanos
              </h1>

              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">

                <Radio
                  size={12}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-600"
                />

                Seguimiento · {RADIUS_KM} km

              </p>

            </div>

          </div>

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Ocultar panel"
              title="Ocultar panel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >

              <PanelLeftClose
                size={20}
                aria-hidden="true"
              />

            </button>
          )}

        </div>

        {/* BUSCADOR */}

        <div className="mt-4 flex gap-2">

          <div className="relative min-w-0 flex-1">

            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              aria-label="Buscar por línea, interno o placa"
              placeholder="Buscar línea, interno..."
              value={n.text}
              onChange={(event) =>
                n.setText(event.target.value)
              }
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-9 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />

            {n.text && (
              <button
                type="button"
                onClick={() => n.setText("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >

                <X
                  size={15}
                  aria-hidden="true"
                />

              </button>
            )}

          </div>

          {/* BOTÓN DE FILTROS */}

          <button
            type="button"
            aria-label="Filtros de búsqueda"
            aria-expanded={filters}
            onClick={() => {
              if (compact) {
                setFilters(true);
                onExpand?.();
              } else {
                setFilters((value) => !value);
              }
            }}
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              filters
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >

            <SlidersHorizontal
              size={20}
              aria-hidden="true"
            />

            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 px-1 text-[10px] font-bold text-white">

                {activeFilters}

              </span>
            )}

          </button>

        </div>

      </div>

      {/* =================================
          CONTENIDO DESPLAZABLE
      ================================= */}

      {!compact && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4">

          {/* Indicadores */}

          <PanelStats n={n} />

          {/* Filtros */}

          {filters && (
            <SearchFilters
              n={n}
              onPick={onPick}
            />
          )}

          {/* Pase temporal */}

          {!guest && n.temp && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

              <Ticket
                size={21}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>

                <p className="text-sm font-bold text-emerald-900">
                  Pase temporal activo
                </p>

                <p className="mt-1 text-xs leading-relaxed text-emerald-800">

                  Tienes un pase temporal hacia la
                  unidad{" "}

                  <strong>
                    {n.temp.transferredTo}
                  </strong>

                  . Abórdala sin pagar de nuevo.

                </p>

              </div>

            </div>
          )}

          {/* Incidencias */}

          {n.incidents.length > 0 && (
            <div
              role="status"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >

              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">

                <TriangleAlert
                  size={18}
                  aria-hidden="true"
                />

                Incidencias en el servicio

              </p>

              <div className="mt-3 space-y-2">

                {n.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-amber-100 bg-white/70 p-3"
                  >

                    <p className="text-xs font-bold text-amber-900">

                      Línea {incident.line} · Interno{" "}
                      {incident.internal}

                    </p>

                    <p className="mt-1 text-xs text-amber-800">

                      {INCIDENT_LABEL[incident.type]}

                      {" · "}

                      {incident.status === "reportado"
                        ? "Reportado"
                        : "En atención"}

                    </p>

                  </div>
                ))}

              </div>

            </div>
          )}

          {/* Errores de conexión */}

          {(n.linesError || n.stopsError) && (
            <ErrorState
              message="No pudimos actualizar líneas o paradas. El mapa puede estar desactualizado."
              onRetry={n.reload}
            />
          )}

          {n.error && (
            <ErrorState
              message="No pudimos buscar micros cercanos. Revisa tu conexión."
              onRetry={n.reload}
            />
          )}

          {/* Recorrido seleccionado */}

          {n.chosenLine && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium leading-relaxed text-blue-800">

              <Navigation
                size={17}
                aria-hidden="true"
                className="shrink-0"
              />

              {n.routePath
                ? `Recorrido de ${n.chosenLine.name}`
                : `${n.chosenLine.name} · recorrido sin geometría disponible`}

            </div>
          )}

          {/* Encabezado de resultados */}

          <div className="flex items-center justify-between gap-2">

            <div>

              <h2 className="text-sm font-bold text-slate-800">
                Unidades encontradas
              </h2>

              <p className="mt-1 text-[11px] text-slate-500">

                {n.loading
                  ? "Actualizando resultados..."
                  : `${n.items.length} resultados`}

              </p>

            </div>

            <button
              type="button"
              onClick={() => void n.reload()}
              disabled={n.loading}
              aria-label="Actualizar micros"
              title="Actualizar micros"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50"
            >

              <RefreshCw
                size={16}
                aria-hidden="true"
                className={
                  n.loading ? "animate-spin" : ""
                }
              />

            </button>

          </div>

          {/* =================================
              LISTADO DE MICROS
          ================================= */}

          <ul
            ref={list}
            className="flex flex-col gap-3"
            aria-label="Micros cercanos"
          >

            {/* Estado de carga */}

            {n.loading &&
              n.items.length === 0 &&
              [0, 1, 2].map((item) => (
                <li
                  key={item}
                  aria-hidden="true"
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
                >

                  <div className="flex items-center gap-3">

                    <Skeleton className="h-12 w-12 rounded-xl" />

                    <div className="flex-1 space-y-2">

                      <Skeleton className="h-4 w-1/2" />

                      <Skeleton className="h-3 w-3/4" />

                    </div>

                  </div>

                  <Skeleton className="h-2 w-full" />

                  <Skeleton className="h-3 w-1/2" />

                </li>
              ))}

            {/* Sin resultados */}

            {!n.loading &&
              n.items.length === 0 &&
              !n.error && (
                <li className="rounded-2xl border border-slate-200 bg-white p-3">

                  <EmptyState
                    icon={BusFront}
                    title="Sin micros en tu radio"
                  >

                    No hay unidades activas con señal
                    cerca de este punto. Prueba con
                    otra referencia o línea.

                  </EmptyState>

                </li>
              )}

            {/* Micros disponibles */}

            {n.items.map((item) => (
              <BusCard
                key={item.bus.id}
                item={item}
                selected={
                  item.bus.id === n.selectedBusId
                }
                onPick={onPick}
                guest={guest}
              />
            ))}

          </ul>

          {/* Unidades sin señal */}

          {n.noSignal.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">

              <p className="flex items-center gap-2 text-xs font-bold text-slate-700">

                <SignalZero
                  size={17}
                  aria-hidden="true"
                  className="text-slate-400"
                />

                Unidades sin señal

              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-500">

                {n.noSignal
                  .map(
                    (bus) =>
                      `Línea ${bus.line} / ${bus.internal}`
                  )
                  .join(", ")}

                . Su última ubicación no se muestra.

              </p>

            </div>
          )}

          {/* Información del servicio */}

          <div className="border-t border-slate-200 pt-3">

            <p className="text-[10px] leading-relaxed text-slate-500">

              Mapa de OpenStreetMap y rutas con OSRM.
              Si el chofer no comparte GPS, la
              posición es simulada.

            </p>

          </div>

        </div>
      )}

    </div>
  );
}

/* =========================================
   PANEL INFERIOR PARA CELULARES
========================================= */

const PEEK = 164;

const FRACTION = [0, 0.46, 0.86];

function MobileSheet({
  snap,
  setSnap,
  children,
}: {
  snap: number;
  setSnap: (value: number) => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  const [drag, setDrag] =
    useState<number | null>(null);

  const start = useRef<{
    y: number;
    h: number;
  } | null>(null);

  const moved = useRef(false);

  const dragHeight = useRef<number | null>(null);

  const total = () =>
    box.current?.parentElement?.clientHeight ??
    600;

  const heights = () => {
    const minimum = Math.min(PEEK, total());

    return [
      minimum,
      ...FRACTION.slice(1).map((fraction) =>
        Math.max(minimum, total() * fraction)
      ),
    ];
  };

  function down(
    event: PointerEvent<HTMLButtonElement>
  ) {
    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    start.current = {
      y: event.clientY,
      h: box.current?.offsetHeight ?? PEEK,
    };

    moved.current = false;

    dragHeight.current = null;
  }

  function move(
    event: PointerEvent<HTMLButtonElement>
  ) {
    if (!start.current) return;

    const dy =
      start.current.y - event.clientY;

    if (Math.abs(dy) > 4) {
      moved.current = true;
    }

    if (moved.current) {
      const minimum = Math.min(PEEK, total());

      const maximum = Math.max(
        minimum,
        total() * 0.9
      );

      const next = Math.max(
        minimum,
        Math.min(
          maximum,
          start.current.h + dy
        )
      );

      dragHeight.current = next;

      setDrag(next);
    }
  }

  function up() {
    if (
      start.current &&
      moved.current &&
      dragHeight.current !== null
    ) {
      const values = heights();

      const currentHeight =
        dragHeight.current;

      const nearest = values.reduce(
        (best, height, index) =>
          Math.abs(height - currentHeight) <
          Math.abs(
            values[best] - currentHeight
          )
            ? index
            : best,
        0
      );

      setSnap(nearest);
    }

    start.current = null;

    dragHeight.current = null;

    setDrag(null);
  }

  function cancel() {
    start.current = null;

    dragHeight.current = null;

    moved.current = false;

    setDrag(null);
  }

  const height =
    drag ??
    (snap === 0
      ? PEEK
      : `max(${PEEK}px, ${FRACTION[snap] * 100}%)`);

  return (
    <div
      ref={box}
      data-dragging={drag !== null}
      style={{ height }}
      className={`psj-sheet-map absolute inset-x-0 bottom-0 z-20 flex max-h-full min-h-0 flex-col overflow-hidden rounded-t-[26px] border-t border-slate-200 bg-white shadow-[0_-8px_35px_rgb(15_23_42/0.15)] ${
        drag === null
          ? "transition-[height] duration-200"
          : ""
      }`}
    >

      {/* Control arrastrable */}

      <button
        type="button"
        aria-label={
          snap === 2
            ? "Reducir lista de micros"
            : "Ampliar lista de micros"
        }
        className="flex h-8 w-full shrink-0 touch-none items-center justify-center bg-white"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onClick={() => {
          if (moved.current) {
            moved.current = false;

            return;
          }

          setSnap(
            snap === 2 ? 0 : snap + 1
          );
        }}
      >

        <span className="h-1.5 w-12 rounded-full bg-slate-300" />

      </button>

      {children}

    </div>
  );
}

/* =========================================
   MAPA PRINCIPAL DEL PASAJERO
========================================= */

export default function PasajeroMap({
  guest = false,
}: {
  guest?: boolean;
}) {
  const n = useNearby();

  const desktop = useDesktop();

  const [open, setOpen] = useState(true);

  const [snap, setSnap] = useState(1);

  const mapContainer =
    useRef<HTMLDivElement>(null);

  const [mapHeight, setMapHeight] =
    useState(0);

  /* Medir la altura disponible para el mapa */

  useEffect(() => {
    const element = mapContainer.current;

    if (!element) return;

    const observer = new ResizeObserver(
      ([entry]) => {
        setMapHeight(
          Math.round(entry.contentRect.height)
        );
      }
    );

    observer.observe(element);

    return () => observer.disconnect();

  }, []);

  /* Seleccionar una unidad */

  function pick(id: string | null) {
    n.selectBus(id);

    if (id) {
      setOpen(true);

      if (snap === 0) {
        setSnap(1);
      }
    }
  }

  const inset = desktop
    ? 0
    : snap === 0
      ? PEEK
      : snap === 1
        ? Math.round(mapHeight * FRACTION[1])
        : 0;

  return (
    <div
      className="psj-map-page relative isolate flex min-h-0 min-w-0 overflow-hidden bg-slate-100"
      style={
        guest
          ? {
              height:
                "calc(100dvh - var(--psj-header-h))",
            }
          : undefined
      }
    >

      {/* =================================
          PANEL LATERAL DE ESCRITORIO
      ================================= */}

      {desktop && open && (
        <aside
          aria-label="Micros cercanos"
          className="relative z-10 flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:w-[380px] 2xl:w-[420px]"
        >

          <div className="h-1 shrink-0 bg-linear-to-r from-emerald-900 to-emerald-400" />

          <Panel
            n={n}
            onPick={pick}
            onCollapse={() => setOpen(false)}
            guest={guest}
          />

        </aside>
      )}

      {/* =================================
          CONTENEDOR PRINCIPAL DEL MAPA
      ================================= */}

      <div
        ref={mapContainer}
        className="relative isolate min-h-0 min-w-0 flex-1 overflow-hidden"
      >

        {/* Mapa real */}

        <div className="absolute inset-0 isolate">

          <MapView
            buses={n.buses}
            user={n.user}
            radiusKm={RADIUS_KM}
            selectedId={n.selected?.id ?? null}
            onSelect={pick}
            routePath={n.routePath}
            fitRoute={
              !!n.chosenLine && !n.selected
            }
            stops={n.visibleStops}
            cluster
            bottomInset={inset}
          />

        </div>

        {/* =================================
            INFORMACIÓN SUPERIOR DEL MAPA
        ================================= */}

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start justify-center gap-2 sm:left-16 sm:right-16 md:justify-between">

          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur-sm lg:flex">

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

              <MapPin
                size={21}
                aria-hidden="true"
              />

            </span>

            <div>

              <p className="text-sm font-bold text-slate-900">
                Mapa de transporte
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Santa Cruz de la Sierra
              </p>

            </div>

          </div>

          {/* Estado del seguimiento */}

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                n.error
                  ? "bg-red-500"
                  : n.loading
                    ? "animate-pulse bg-amber-500"
                    : "bg-emerald-500"
              }`}
            />

            <span className="text-[11px] font-semibold text-slate-700">

              {n.error
                ? "Error de conexión"
                : n.loading
                  ? "Actualizando"
                  : "Seguimiento de micros"}

            </span>

          </div>

        </div>

        {/* =================================
            ABRIR PANEL OCULTO
        ================================= */}

        {desktop && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute left-4 top-24 z-10 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 text-sm font-bold text-emerald-700 shadow-lg transition-colors hover:bg-emerald-50"
          >

            <PanelLeftOpen
              size={20}
              aria-hidden="true"
            />

            Ver micros ({n.items.length})

          </button>
        )}

        {/* =================================
            GEOLOCALIZACIÓN
        ================================= */}

        {desktop && (
          <div className="absolute bottom-10 right-4 z-10 flex max-w-[240px] flex-col items-end gap-2">

            {n.geoMsg && (
              <p
                role="status"
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-md"
              >

                {n.geoMsg}

              </p>
            )}

            <button
              type="button"
              onClick={n.locate}
              title="Usar mi ubicación"
              aria-label="Usar mi ubicación"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-700 shadow-lg transition-colors hover:bg-emerald-50"
            >

              <LocateFixed
                size={23}
                aria-hidden="true"
              />

            </button>

          </div>
        )}

        {/* =================================
            PANEL RESPONSIVE PARA CELULARES
        ================================= */}

        {!desktop && (
          <MobileSheet
            snap={snap}
            setSnap={setSnap}
          >

            <Panel
              n={n}
              onPick={pick}
              guest={guest}
              compact={snap === 0}
              onExpand={() => setSnap(1)}
            />

          </MobileSheet>
        )}

      </div>

    </div>
  );
}
