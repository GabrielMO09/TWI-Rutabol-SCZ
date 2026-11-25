
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BusFront,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  MessageSquareWarning,
  OctagonAlert,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  ShieldCheck,
  Ticket,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";

import { useFetch } from "@/lib/api";

import type {
  Overview,
} from "@/components/control/types";

import {
  Chip,
  Empty,
  QueryState,
  Status,
  Table,
  date,
  money,
  text,
} from "@/components/control/ui";

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all enabled:hover:border-violet-300 enabled:hover:bg-violet-50 enabled:hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50";

const INPUT =
  "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

/* =========================================
   TIPOS DE DATOS
========================================= */

type HealthCheck =
  Overview["health"][number];

type ControlBus =
  Overview["buses"][number];

type BusFilter =
  | "todos"
  | "servicio"
  | "sin-senal"
  | "inactivos";

type ColorTone =
  | "violet"
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "slate";

/* =========================================
   PALETA DE INDICADORES
========================================= */

const TONES: Record<
  ColorTone,
  {
    icon: string;
    value: string;
  }
> = {
  violet: {
    icon: "bg-violet-50 text-violet-700",
    value: "text-violet-700",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-emerald-700",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700",
    value: "text-blue-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    value: "text-amber-700",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    value: "text-red-700",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-700",
  },
};

/* =========================================
   FUNCIONES AUXILIARES
========================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "es-BO"
  ).format(value);
}

function clampPct(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
}

function occupancyColor(value: number) {
  if (value >= 100) return "bg-red-500";
  if (value >= 85) return "bg-amber-500";
  if (value >= 60) return "bg-lime-600";

  return "bg-emerald-500";
}

function healthRank(check: HealthCheck) {
  if (check.ok) return 3;

  if (check.severity === "critica") return 0;

  if (check.severity === "aviso") return 1;

  return 2;
}

function lastSeenLabel(
  value: number,
  now: number
) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Sin registro";
  }

  return `Hace ${Math.max(
    0,
    Math.floor((now - value) / 1000)
  )} s`;
}

/* =========================================
   ENCABEZADO DE SECCIÓN
========================================= */

function SectionHeader({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">

      <div className="flex min-w-0 items-center gap-3">

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">

          <Icon
            size={23}
            aria-hidden="true"
          />

        </span>

        <div className="min-w-0">

          <h2 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          )}

        </div>

      </div>

      {children}

    </div>
  );
}

/* =========================================
   TARJETAS DE INDICADORES
========================================= */

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "violet",
  coloredValue = false,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: ColorTone;
  coloredValue?: boolean;
}) {
  const appearance = TONES[tone];

  return (
    <article
      className={`${CARD} group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >

      <div className="mb-4 flex items-center justify-between gap-2">

        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${appearance.icon}`}
        >

          <Icon
            size={24}
            aria-hidden="true"
          />

        </span>

        <Activity
          size={18}
          aria-hidden="true"
          className="text-slate-200 transition-colors group-hover:text-violet-300"
        />

      </div>

      <p className="text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl ${
          coloredValue
            ? appearance.value
            : "text-slate-900"
        }`}
      >

        {typeof value === "number"
          ? formatNumber(value)
          : value}

      </p>

      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {description}
        </p>
      )}

    </article>
  );
}

/* =========================================
   ESTADO DE SALUD DEL SISTEMA
========================================= */

function HealthItem({
  check,
}: {
  check: HealthCheck;
}) {
  const critical =
    !check.ok &&
    check.severity === "critica";

  const Icon = check.ok
    ? CheckCircle2
    : critical
      ? OctagonAlert
      : AlertTriangle;

  const appearance = check.ok
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : critical
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${appearance}`}
      >

        <Icon
          size={23}
          aria-hidden="true"
        />

      </span>

      <div className="min-w-0 flex-1">

        <h3 className="break-words text-sm font-bold text-slate-900">
          {check.title}
        </h3>

        <p className="mt-2 break-words text-xs leading-relaxed text-slate-500 sm:text-sm">
          {check.detail}
        </p>

        <div className="mt-3">

          <Chip
            tone={
              check.ok
                ? "good"
                : critical
                  ? "danger"
                  : "warn"
            }
          >

            {check.ok
              ? "Funciona"
              : critical
                ? "Falla crítica"
                : "Requiere atención"}

          </Chip>

        </div>

      </div>

    </li>
  );
}

/* =========================================
   GRÁFICO CIRCULAR DE OCUPACIÓN
========================================= */

function OccupancyChart({
  value,
}: {
  value: number;
}) {
  const percentage = clampPct(value);

  const radius = 67;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference *
    (1 - percentage / 100);

  return (
    <section
      className={`${CARD} flex flex-col p-5 sm:p-6`}
    >

      <SectionHeader
        icon={Activity}
        title="Ocupación promedio"
        description="Indicador global del servicio."
      />

      <div className="flex flex-1 items-center justify-center py-6">

        <div
          role="img"
          aria-label={`Ocupación promedio: ${value.toFixed(1)} por ciento`}
          className="relative w-full max-w-[230px]"
        >

          <svg
            viewBox="0 0 180 180"
            className="h-auto w-full"
            aria-hidden="true"
          >

            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#ede9fe"
              strokeWidth="17"
            />

            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="17"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
              className="transition-all duration-500"
            />

          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">

            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">

              {value.toFixed(1)}%

            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">

              Ocupación

            </p>

          </div>

        </div>

      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-center">

        <p className="text-xs leading-relaxed text-violet-800">

          Calculado a partir del indicador
          de ocupación proporcionado por el sistema.

        </p>

      </div>

    </section>
  );
}

/* =========================================
   RECAUDACIÓN POR CATEGORÍA
========================================= */

function RevenueChart({
  kpis,
}: {
  kpis: Overview["kpis"];
}) {
  const categories = [
    {
      label: "General",
      value: kpis.recaudacionPorCategoria.general,
      icon: Ticket,
      bar: "bg-violet-600",
      style: "bg-violet-50 text-violet-700",
    },
    {
      label: "Escolar",
      value: kpis.recaudacionPorCategoria.escolar,
      icon: GraduationCap,
      bar: "bg-blue-600",
      style: "bg-blue-50 text-blue-700",
    },
    {
      label: "Universitaria",
      value: kpis.recaudacionPorCategoria.universitario,
      icon: GraduationCap,
      bar: "bg-emerald-500",
      style: "bg-emerald-50 text-emerald-700",
    },
  ];

  const total =
    categories.reduce(
      (sum, item) =>
        sum + Math.max(0, item.value),
      0
    );

  return (
    <section
      className={`${CARD} p-5 sm:p-6`}
    >

      <SectionHeader
        icon={Wallet}
        title="Recaudación del servicio"
        description="Distribución por categoría tarifaria."
      />

      {/* Recaudación total */}

      <div className="my-6 rounded-2xl bg-linear-to-br from-violet-950 to-violet-700 p-5 text-white">

        <div className="flex items-center justify-between gap-3">

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">

              Recaudación total

            </p>

            <p className="mt-3 break-words text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">

              {money(kpis.recaudacion)}

            </p>

          </div>

          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">

            <CircleDollarSign
              size={30}
              aria-hidden="true"
            />

          </span>

        </div>

      </div>

      {/* Distribución por categoría */}

      <div className="space-y-5">

        {categories.map((category) => {
          const Icon = category.icon;

          const percentage = total > 0
            ? clampPct(
                category.value / total * 100
              )
            : 0;

          return (
            <div key={category.label}>

              <div className="mb-3 flex items-center justify-between gap-3">

                <div className="flex min-w-0 items-center gap-2">

                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${category.style}`}>

                    <Icon
                      size={18}
                      aria-hidden="true"
                    />

                  </span>

                  <span className="text-xs font-semibold text-slate-700 sm:text-sm">
                    {category.label}
                  </span>

                </div>

                <div className="text-right">

                  <p className="text-sm font-extrabold tabular-nums text-slate-900">
                    {money(category.value)}
                  </p>

                  <p className="mt-1 text-[10px] tabular-nums text-slate-500">
                    {percentage.toFixed(1)}%
                  </p>

                </div>

              </div>

              <div
                role="progressbar"
                aria-label={`Recaudación ${category.label}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percentage)}
                className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              >

                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${category.bar}`}
                  style={{
                    width: `${percentage}%`,
                  }}
                />

              </div>

            </div>
          );
        })}

      </div>

      <p className="mt-6 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">

        Los porcentajes representan la distribución
        de los importes entre las tres categorías
        disponibles.

      </p>

    </section>
  );
}

/* =========================================
   INDICADORES POR LÍNEA
========================================= */

function LinesSection({
  lines,
}: {
  lines: Overview["byLine"];
}) {
  const [sort, setSort] = useState<
    "linea" | "viajes" | "recaudacion" | "ocupacion"
  >("linea");

  const sorted = useMemo(() => {
    const rows = [...lines];

    switch (sort) {
      case "viajes":
        return rows.sort(
          (a, b) => b.viajes - a.viajes
        );

      case "recaudacion":
        return rows.sort(
          (a, b) =>
            b.recaudacion - a.recaudacion
        );

      case "ocupacion":
        return rows.sort(
          (a, b) =>
            b.ocupacionPromedioPct -
            a.ocupacionPromedioPct
        );

      default:
        return rows.sort(
          (a, b) =>
            String(a.line).localeCompare(
              String(b.line),
              "es",
              { numeric: true }
            )
        );
    }
  }, [lines, sort]);

  return (
    <section className={`${CARD} overflow-hidden`}>

      <div className="border-b border-slate-100 p-5 sm:p-6">

        <SectionHeader
          title="Servicio por línea"
          description="Indicadores operativos de cada línea de transporte."
          icon={BusFront}
        >

          <div className="flex items-center gap-2">

            <label
              htmlFor="line-sort"
              className="text-xs text-slate-500"
            >
              Ordenar
            </label>

            <select
              id="line-sort"
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value as typeof sort
                )
              }
              className={INPUT}
            >

              <option value="linea">
                Línea
              </option>

              <option value="viajes">
                Más viajes
              </option>

              <option value="recaudacion">
                Mayor recaudación
              </option>

              <option value="ocupacion">
                Mayor ocupación
              </option>

            </select>

          </div>

        </SectionHeader>

      </div>

      {!lines.length ? (
        <div className="p-6">
          <Empty>No hay líneas registradas.</Empty>
        </div>
      ) : (
        <div className="overflow-x-auto">

          <Table
            caption="Indicadores por línea"
            headers={[
              "Línea",
              "Buses",
              "Viajes",
              "Recaudación",
              "Ocupación promedio",
            ]}
          >

            {sorted.map((line) => {

              const percentage = clampPct(
                line.ocupacionPromedioPct
              );

              return (
                <tr
                  key={line.line}
                  className="transition-colors hover:bg-violet-50/50"
                >

                  <td>

                    <span className="inline-flex min-h-9 min-w-10 items-center justify-center rounded-lg bg-violet-50 px-3 font-extrabold text-violet-700">

                      {line.line}

                    </span>

                  </td>

                  <td className="font-semibold tabular-nums">
                    {formatNumber(line.buses)}
                  </td>

                  <td className="tabular-nums">
                    {formatNumber(line.viajes)}
                  </td>

                  <td className="whitespace-nowrap font-bold tabular-nums text-slate-800">
                    {money(line.recaudacion)}
                  </td>

                  <td>

                    <div className="min-w-[125px]">

                      <p className="mb-2 text-xs font-semibold tabular-nums text-slate-700">

                        {line.ocupacionPromedioPct.toFixed(1)}%

                      </p>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className={`h-full rounded-full ${occupancyColor(percentage)}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>

                  </td>

                </tr>
              );
            })}

          </Table>

        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">

        {lines.length} líneas registradas

      </div>

    </section>
  );
}

/* =========================================
   INDICADOR DE OCUPACIÓN DE UN MICRO
========================================= */

function BusOccupancy({
  bus,
}: {
  bus: ControlBus;
}) {
  const percentage = bus.max > 0
    ? clampPct(
        bus.occupancy / bus.max * 100
      )
    : 0;

  return (
    <div className="min-w-[95px]">

      <p className="mb-2 whitespace-nowrap text-xs font-bold tabular-nums text-slate-700">

        {bus.occupancy} / {bus.max}

      </p>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-[width] duration-300 ${occupancyColor(percentage)}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

/* =========================================
   MONITOREO DE MICROS
========================================= */

function BusesSection({
  buses,
  now,
}: {
  buses: Overview["buses"];
  now: number;
}) {
  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<BusFilter>("todos");

  const [line, setLine] =
    useState("");

  const lines = useMemo(
    () =>
      [...new Set(
        buses.map(
          (bus) => String(bus.line)
        )
      )].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            { numeric: true }
          )
      ),
    [buses]
  );

  const filtered = useMemo(() => {

    const query =
      search.trim().toLowerCase();

    return buses.filter((bus) => {

      if (
        line &&
        String(bus.line) !== line
      ) {
        return false;
      }

      if (
        filter === "servicio" &&
        !bus.onDuty
      ) {
        return false;
      }

      if (
        filter === "sin-senal" &&
        !bus.stale
      ) {
        return false;
      }

      if (
        filter === "inactivos" &&
        bus.active
      ) {
        return false;
      }

      if (query) {
        const searchable = [
          bus.id,
          bus.line,
          bus.internal,
          bus.plate,
          bus.status,
          bus.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });

  }, [buses, search, filter, line]);

  const filtering =
    !!search ||
    !!line ||
    filter !== "todos";

  function clear() {
    setSearch("");
    setLine("");
    setFilter("todos");
  }

  return (
    <section className={`${CARD} overflow-hidden`}>

      {/* Encabezado */}

      <div className="space-y-5 border-b border-slate-100 p-5 sm:p-6">

        <SectionHeader
          title="Monitoreo de unidades"
          description="Consulta el estado operativo y la señal de cada micro."
          icon={Radio}
        >

          <span className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">

            {buses.length} unidades

          </span>

        </SectionHeader>

        {/* Buscador y filtros */}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">

          <div className="relative min-w-0">

            <Search
              size={19}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              aria-label="Buscar unidades"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar línea, interno o placa..."
              className={`${INPUT} pl-11`}
            />

          </div>

          <select
            aria-label="Filtrar por estado operativo"
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as BusFilter
              )
            }
            className={INPUT}
          >

            <option value="todos">
              Todos los estados
            </option>

            <option value="servicio">
              En servicio
            </option>

            <option value="sin-senal">
              Sin señal
            </option>

            <option value="inactivos">
              Inactivos
            </option>

          </select>

          <select
            aria-label="Filtrar por línea"
            value={line}
            onChange={(event) =>
              setLine(event.target.value)
            }
            className={INPUT}
          >

            <option value="">
              Todas las líneas
            </option>

            {lines.map((item) => (
              <option key={item} value={item}>
                Línea {item}
              </option>
            ))}

          </select>

        </div>

        {filtering && (
          <div className="flex flex-wrap items-center justify-between gap-2">

            <p
              role="status"
              className="text-xs text-slate-500"
            >

              {filtered.length} de {buses.length}
              {" "}unidades encontradas

            </p>

            <button
              type="button"
              onClick={clear}
              className={OUTLINE}
            >

              <X size={15} aria-hidden="true" />

              Limpiar filtros

            </button>

          </div>
        )}

      </div>

      {/* Resultados */}

      {!buses.length ? (
        <div className="p-6">

          <Empty>No hay buses registrados.</Empty>

        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center gap-4 p-8">

          <Empty>
            Ninguna unidad coincide con los filtros.
          </Empty>

          <button
            type="button"
            onClick={clear}
            className={OUTLINE}
          >
            Limpiar filtros
          </button>

        </div>
      ) : (
        <>

          {/* Tabla de escritorio */}

          <div className="hidden overflow-x-auto lg:block">

            <Table
              caption="Estado de los buses"
              headers={[
                "Línea",
                "Interno",
                "Placa",
                "Habilitación",
                "Estado",
                "Ocupación",
                "En servicio",
                "Señal",
                "Fuente",
                "Última actualización",
              ]}
            >

              {filtered.map((bus) => (
                <tr
                  key={bus.id}
                  className="transition-colors hover:bg-violet-50/50"
                >

                  <td>

                    <span className="inline-flex min-h-9 min-w-10 items-center justify-center rounded-lg bg-violet-50 px-3 font-bold text-violet-700">

                      {bus.line}

                    </span>

                  </td>

                  <td className="font-semibold">
                    {bus.internal}
                  </td>

                  <td className="whitespace-nowrap">

                    {bus.plate || "—"}

                  </td>

                  <td>

                    <Chip
                      tone={bus.active ? "good" : "warn"}
                    >

                      {bus.active
                        ? "Habilitado"
                        : "Inactivo"}

                    </Chip>

                  </td>

                  <td>

                    <Status value={bus.status} />

                  </td>

                  <td>

                    <BusOccupancy bus={bus} />

                  </td>

                  <td>

                    {bus.onDuty ? "Sí" : "No"}

                  </td>

                  <td>

                    <Chip
                      tone={bus.stale ? "danger" : "good"}
                    >

                      {bus.stale
                        ? "Sin señal"
                        : "Con señal"}

                    </Chip>

                  </td>

                  <td>

                    {text(bus.source)}

                  </td>

                  <td
                    className="whitespace-nowrap text-xs text-slate-500"
                    title={
                      bus.lastSeen > 0
                        ? date(bus.lastSeen)
                        : undefined
                    }
                  >

                    {lastSeenLabel(
                      bus.lastSeen,
                      now
                    )}

                  </td>

                </tr>
              ))}

            </Table>

          </div>

          {/* Tarjetas para celulares */}

          <div className="grid gap-3 bg-slate-50/50 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">

            {filtered.map((bus) => (
              <article
                key={bus.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >

                <div className="flex items-start gap-3">

                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-extrabold text-violet-700">

                    {bus.line}

                  </span>

                  <div className="min-w-0 flex-1">

                    <h3 className="text-sm font-bold text-slate-900">

                      Línea {bus.line}

                    </h3>

                    <p className="mt-1 text-xs text-slate-500">

                      Interno {bus.internal}

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      Placa: {bus.plate || "—"}

                    </p>

                  </div>

                  <Chip
                    tone={
                      bus.stale ? "danger" : "good"
                    }
                  >

                    {bus.stale
                      ? "Sin señal"
                      : "Con señal"}

                  </Chip>

                </div>

                <div className="mt-4 space-y-3 border-y border-slate-100 py-4">

                  <div className="flex items-center justify-between gap-2">

                    <span className="text-xs text-slate-500">

                      Habilitación

                    </span>

                    <Chip
                      tone={bus.active ? "good" : "warn"}
                    >

                      {bus.active
                        ? "Habilitado"
                        : "Inactivo"}

                    </Chip>

                  </div>

                  <div className="flex items-center justify-between gap-2">

                    <span className="text-xs text-slate-500">
                      Estado
                    </span>

                    <Status value={bus.status} />

                  </div>

                  <div className="flex items-center justify-between gap-2">

                    <span className="text-xs text-slate-500">

                      En servicio

                    </span>

                    <span className="text-xs font-bold text-slate-700">

                      {bus.onDuty ? "Sí" : "No"}

                    </span>

                  </div>

                  <div className="flex items-center justify-between gap-2">

                    <span className="text-xs text-slate-500">

                      Fuente

                    </span>

                    <span className="text-xs font-medium text-slate-700">

                      {text(bus.source)}

                    </span>

                  </div>

                </div>

                <div className="mt-4">

                  <p className="mb-2 text-xs text-slate-500">

                    Ocupación actual

                  </p>

                  <BusOccupancy bus={bus} />

                </div>

                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">

                  <Clock
                    size={14}
                    aria-hidden="true"
                  />

                  {lastSeenLabel(bus.lastSeen, now)}

                </p>

              </article>
            ))}

          </div>

        </>
      )}

      {/* Pie de tabla */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">

        <p className="text-xs text-slate-500">

          Mostrando {filtered.length} de {buses.length}
          {" "}unidades

        </p>

        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700">

          <RefreshCw size={13} aria-hidden="true" />

          Actualización cada 5 segundos

        </p>

      </div>

    </section>
  );
}

/* =========================================
   PÁGINA PRINCIPAL DEL CENTRO DE CONTROL
========================================= */

export default function ControlOverview() {
  const query = useFetch<Overview>(
    "/control/overview",
    5000
  );

  const data = query.data;

  const now = Date.now();

  const [showHealth, setShowHealth] =
    useState(true);

  /* =====================================
     CLASIFICACIÓN DE COMPROBACIONES
  ===================================== */

  const health = useMemo(
    () =>
      [...(data?.health ?? [])].sort(
        (a, b) =>
          healthRank(a) - healthRank(b)
      ),
    [data?.health]
  );

  const failures = health.filter(
    (check) =>
      !check.ok &&
      check.severity === "critica"
  ).length;

  const warnings = health.filter(
    (check) =>
      !check.ok &&
      check.severity !== "critica"
  ).length;

  const correct = health.filter(
    (check) => check.ok
  ).length;

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-5 pb-4 sm:gap-6">

      {/* =================================
          ENCABEZADO ADMINISTRATIVO
      ================================= */}

      <section className="animate-fade-up relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-slate-950 via-violet-950 to-violet-800 p-5 text-white shadow-xl sm:p-8">

        {/* Decoraciones */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-96 w-96 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-500/10"
        />

        <div className="relative">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">

              RUTABOL-SCZ · Administración

            </p>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">

              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  query.error
                    ? "bg-red-400"
                    : query.loading
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                }`}
              />

              {query.error
                ? "Error de conexión"
                : query.loading
                  ? "Actualizando"
                  : data
                    ? "Monitoreo automático"
                    : "Sin información"}

            </span>

          </div>

          <div className="my-7 flex items-center justify-between gap-4">

            <div className="min-w-0 flex-1">

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">

                Centro de Control

              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-violet-100/80 sm:text-base">

                Supervisa el estado del sistema,
                las unidades, los viajes, la recaudación
                y las incidencias del transporte urbano.

              </p>

            </div>

            <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 sm:flex">

              <LayoutDashboard
                size={57}
                aria-hidden="true"
                className="text-violet-200"
              />

            </div>

          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">

            <p className="flex items-center gap-2 text-xs text-violet-100">

              <RefreshCw
                size={16}
                aria-hidden="true"
                className={
                  query.loading
                    ? "animate-spin"
                    : ""
                }
              />

              Actualización automática cada 5 segundos

            </p>

            <button
              type="button"
              disabled={query.loading}
              onClick={() => void query.reload()}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-colors enabled:hover:bg-white/20 disabled:opacity-50"
            >

              {query.loading ? (
                <LoaderCircle
                  size={16}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={16}
                  aria-hidden="true"
                />
              )}

              Actualizar datos

            </button>

          </div>

        </div>

      </section>

      {/* Estado original de la consulta */}

      <QueryState {...query} />

      {!query.loading &&
        !query.error &&
        !data && (
          <Empty>
            No hay información del sistema.
          </Empty>
        )}

      {data && (
        <>

          {/* =============================
              ESTADO DEL SISTEMA
          ============================= */}

          <section
            aria-label="Estado del sistema"
            className="animate-fade-up delay-100 space-y-4"
          >

            <SectionHeader
              title="Estado del sistema"
              description="Resultados de las comprobaciones disponibles."
              icon={ShieldCheck}
            />

            <div
              role="status"
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
            >

              <MetricCard
                label="Comprobaciones correctas"
                value={correct}
                icon={CheckCircle2}
                tone="green"
                coloredValue
              />

              <MetricCard
                label="Avisos del sistema"
                value={warnings}
                icon={AlertTriangle}
                tone="amber"
                coloredValue
              />

              <div className="col-span-2 lg:col-span-1">

                <MetricCard
                  label="Fallas críticas"
                  value={failures}
                  icon={OctagonAlert}
                  tone="red"
                  coloredValue
                />

              </div>

            </div>

            {/* Comprobaciones detalladas */}

            <div className={`${CARD} overflow-hidden`}>

              <button
                type="button"
                aria-expanded={showHealth}
                aria-controls="health-details"
                onClick={() =>
                  setShowHealth(
                    (previous) => !previous
                  )
                }
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:p-5"
              >

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">

                  <ClipboardCheck
                    size={22}
                    aria-hidden="true"
                  />

                </span>

                <span className="min-w-0 flex-1">

                  <span className="block text-sm font-bold text-slate-900">

                    Diagnóstico del sistema

                  </span>

                  <span className="mt-1 block text-xs text-slate-500">

                    {health.length} comprobaciones

                  </span>

                </span>

                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className={`shrink-0 text-slate-400 transition-transform ${
                    showHealth
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {showHealth && (
                <div
                  id="health-details"
                  className="border-t border-slate-100 p-4 sm:p-5"
                >

                  {!health.length ? (
                    <Empty>

                      No hay comprobaciones disponibles.

                    </Empty>
                  ) : (
                    <ul className="grid gap-3 md:grid-cols-2">

                      {health.map((check) => (
                        <HealthItem
                          key={check.id}
                          check={check}
                        />
                      ))}

                    </ul>
                  )}

                </div>
              )}

            </div>

          </section>

          {/* =============================
              INDICADORES OPERATIVOS
          ============================= */}

          <section
            aria-label="Indicadores operativos"
            className="animate-fade-up delay-200 space-y-4"
          >

            <SectionHeader
              icon={Activity}
              title="Indicadores operativos"
              description="Resumen de unidades y viajes registrados."
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">

              <MetricCard
                label="Buses activos"
                value={data.kpis.busesActivos}
                description="Unidades activas registradas."
                icon={BusFront}
                tone="violet"
              />

              <MetricCard
                label="Buses en servicio"
                value={data.kpis.busesEnServicio}
                description="Unidades con servicio activo."
                icon={Radio}
                tone="green"
              />

              <MetricCard
                label="Buses sin señal"
                value={data.kpis.busesSinSenal}
                description="Unidades sin señal reciente."
                icon={WifiOff}
                tone={
                  data.kpis.busesSinSenal > 0
                    ? "red"
                    : "green"
                }
              />

              <MetricCard
                label="Viajes registrados"
                value={data.kpis.viajes}
                description="Viajes contabilizados por el sistema."
                icon={Ticket}
                tone="blue"
              />

            </div>

          </section>

          {/* =============================
              GRÁFICOS ADMINISTRATIVOS
          ============================= */}

          <div className="animate-fade-up delay-200 grid min-w-0 items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">

            <RevenueChart
              kpis={data.kpis}
            />

            <OccupancyChart
              value={data.kpis.ocupacionPromedioPct}
            />

          </div>

          {/* =============================
              PENDIENTES ADMINISTRATIVOS
          ============================= */}

          <section
            aria-label="Gestión administrativa"
            className="animate-fade-up delay-300 space-y-4"
          >

            <SectionHeader
              title="Gestión administrativa"
              description="Solicitudes, incidencias y operaciones registradas."
              icon={ClipboardCheck}
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">

              <MetricCard
                label="Incidentes abiertos"
                value={data.kpis.incidentesAbiertos}
                icon={AlertTriangle}
                tone="red"
              />

              <MetricCard
                label="Reclamos abiertos"
                value={data.kpis.reclamosAbiertos}
                icon={MessageSquareWarning}
                tone="amber"
              />

              <MetricCard
                label="Acreditaciones pendientes"
                value={data.kpis.acreditacionesPendientes}
                icon={GraduationCap}
                tone="blue"
              />

              <MetricCard
                label="Trasbordos"
                value={data.kpis.trasbordos}
                icon={Repeat}
                tone="violet"
              />

              <MetricCard
                label="Recargas pendientes"
                value={data.kpis.recargasPendientes}
                icon={Wallet}
                tone="amber"
              />

            </div>

          </section>

          {/* =============================
              SERVICIO POR LÍNEA
          ============================= */}

          <LinesSection
            lines={data.byLine}
          />

          {/* =============================
              MONITOREO DE MICROS
          ============================= */}

          <BusesSection
            buses={data.buses}
            now={now}
          />

          {/* =============================
              ALERTAS E INCIDENTES
          ============================= */}

          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">

            {/* =========================
                ALERTAS ACTIVAS
            ========================= */}

            <section className={`${CARD} overflow-hidden`}>

              <div className="border-b border-slate-100 p-5 sm:p-6">

                <SectionHeader
                  icon={AlertTriangle}
                  title="Alertas activas"
                  description="Avisos operativos que requieren supervisión."
                >

                  <span className={`rounded-xl px-3 py-2 text-xs font-bold ${
                    data.alerts.length
                      ? "bg-red-50 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}>

                    {data.alerts.length}

                  </span>

                </SectionHeader>

              </div>

              {!data.alerts.length ? (
                <div className="flex flex-col items-center p-8 text-center">

                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">

                    <ShieldCheck
                      size={32}
                      aria-hidden="true"
                    />

                  </span>

                  <Empty>

                    No hay alertas activas.

                  </Empty>

                </div>
              ) : (
                <ul className="max-h-[650px] space-y-3 overflow-y-auto p-4 sm:p-5">

                  {[...data.alerts]
                    .sort((a, b) => b.at - a.at)
                    .map((alert) => {

                      const capacity =
                        alert.kind === "aforo";

                      return (
                        <li
                          key={alert.id}
                          className={`flex items-start gap-3 rounded-2xl border p-4 ${
                            capacity
                              ? "border-amber-100 bg-amber-50/60"
                              : "border-red-100 bg-red-50/60"
                          }`}
                        >

                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            capacity
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}>

                            <AlertTriangle
                              size={22}
                              aria-hidden="true"
                            />

                          </span>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="break-words text-sm font-bold text-slate-900">

                                Unidad {alert.busId}

                              </p>

                              <Chip
                                tone={
                                  capacity
                                    ? "warn"
                                    : "danger"
                                }
                              >

                                {text(alert.kind)}

                              </Chip>

                            </div>

                            <p className="mt-3 break-words text-xs leading-relaxed text-slate-700 sm:text-sm">

                              {alert.message}

                            </p>

                            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">

                              <Clock
                                size={14}
                                aria-hidden="true"
                              />

                              {date(alert.at)}

                            </p>

                          </div>

                        </li>
                      );
                    })}

                </ul>
              )}

            </section>

            {/* =========================
                INCIDENTES RECIENTES
            ========================= */}

            <section className={`${CARD} overflow-hidden`}>

              <div className="border-b border-slate-100 p-5 sm:p-6">

                <SectionHeader
                  icon={OctagonAlert}
                  title="Incidentes recientes"
                  description="Últimos incidentes registrados en el servicio."
                />

              </div>

              {!data.incidents.length ? (
                <div className="flex flex-col items-center p-8 text-center">

                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                    <ClipboardCheck
                      size={32}
                      aria-hidden="true"
                    />

                  </span>

                  <Empty>

                    No hay incidentes registrados.

                  </Empty>

                </div>
              ) : (
                <ul className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto">

                  {[...data.incidents]
                    .sort((a, b) => b.at - a.at)
                    .slice(0, 8)
                    .map((incident) => (
                      <li
                        key={incident.id}
                        className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50 sm:p-5"
                      >

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">

                          <OctagonAlert
                            size={22}
                            aria-hidden="true"
                          />

                        </span>

                        <div className="min-w-0 flex-1">

                          <p className="break-words text-sm font-bold text-slate-900">

                            {text(incident.type)}

                          </p>

                          <p className="mt-1 text-xs font-medium text-violet-700">

                            Línea {incident.line}
                            {" "}· Interno {incident.internal}

                          </p>

                          <p className="my-3 break-words text-xs leading-relaxed text-slate-600 sm:text-sm">

                            {incident.description}

                          </p>

                          <div className="flex flex-wrap gap-2">

                            <Status value={incident.severity} />

                            <Status value={incident.status} />

                          </div>

                          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">

                            <Clock
                              size={14}
                              aria-hidden="true"
                            />

                            {date(incident.at)}

                          </p>

                        </div>

                      </li>
                    ))}

                </ul>
              )}

              <div className="border-t border-slate-100 p-4 sm:p-5">

                <Link
                  href="/control/incidentes"
                  className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-900"
                >

                  Gestionar incidentes

                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                    className="ml-auto transition-transform group-hover:translate-x-1"
                  />

                </Link>

              </div>

            </section>

          </div>

        </>
      )}

      {/* =================================
          PIE DEL DASHBOARD
      ================================= */}

      <div className="flex items-center justify-center gap-2 py-4 text-center text-[11px] text-slate-400">

        <ShieldCheck
          size={16}
          aria-hidden="true"
          className="shrink-0 text-violet-600"
        />

        RUTABOL-SCZ · Centro de Control y Supervisión

      </div>

    </div>
  );
}
