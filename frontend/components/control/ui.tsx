
"use client";

import {
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { act } from "@/lib/api";

/* =========================================
   FUNCIONES DE FORMATO
========================================= */

export const date = (value?: number) => {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "Sin fecha";
  }

  const result = new Date(value);

  return Number.isNaN(result.getTime())
    ? "Sin fecha"
    : result.toLocaleString("es-BO");
};

export const money = (value: number) =>
  `Bs ${value.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* =========================================
   ETIQUETAS DEL SISTEMA
========================================= */

const labels: Record<string, string> = {
  activo: "Activo",
  activa: "Activa",
  suspendido: "Suspendido",
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  observada: "Observada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  recibido: "Recibido",
  "en-revision": "En revisión",
  resuelto: "Resuelto",
  rechazado: "Rechazado",
  reportado: "Reportado",
  "en-atencion": "En atención",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  escolar: "Escolar",
  universitario: "Universitario",
  general: "General",
  chofer: "Conductor",
  pasajero: "Pasajero",
  control: "Centro de Control",
  descanso: "Descanso",
  emergencia: "Emergencia",
  accidente: "Accidente",
  "falla-mecanica": "Falla mecánica",
  bloqueo: "Bloqueo",
  averia: "Avería",
  otro: "Otro",
  simulado: "Simulado",
  gps: "GPS",
  pagado: "Pagado",
  abordado: "Abordado",
  "pase-temporal": "Pase temporal",
  aforo: "Aforo",
  incidente: "Incidente",
};

export const text = (value: string) =>
  labels[value] ?? value;

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors enabled:hover:border-violet-300 enabled:hover:bg-violet-50 enabled:hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50";

type ChipTone =
  | "good"
  | "warn"
  | "danger"
  | "neutral";

type MetricTone =
  | "violet"
  | "green"
  | "blue"
  | "amber"
  | "red"
  | "slate";

/* =========================================
   PALETA DE ESTADOS
========================================= */

const CHIP_STYLES: Record<
  ChipTone,
  {
    container: string;
    dot: string;
  }
> = {
  good: {
    container:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    dot: "bg-emerald-500",
  },

  warn: {
    container:
      "border-amber-200 bg-amber-50 text-amber-700",

    dot: "bg-amber-500",
  },

  danger: {
    container:
      "border-red-200 bg-red-50 text-red-700",

    dot: "bg-red-500",
  },

  neutral: {
    container:
      "border-slate-200 bg-slate-100 text-slate-600",

    dot: "bg-slate-400",
  },
};

/* =========================================
   PALETA DE INDICADORES
========================================= */

const METRIC_STYLES: Record<
  MetricTone,
  string
> = {
  violet:
    "bg-violet-50 text-violet-700",

  green:
    "bg-emerald-50 text-emerald-700",

  blue:
    "bg-blue-50 text-blue-700",

  amber:
    "bg-amber-50 text-amber-700",

  red:
    "bg-red-50 text-red-700",

  slate:
    "bg-slate-100 text-slate-600",
};

/* =========================================
   COMPONENTE CHIP
   Indicadores visuales de estado
========================================= */

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  const appearance = CHIP_STYLES[tone];

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-relaxed ${appearance.container}`}
    >

      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${appearance.dot}`}
      />

      <span className="min-w-0 break-words">

        {children}

      </span>

    </span>
  );
}

/* =========================================
   COMPONENTE STATUS
   Clasificación original conservada
========================================= */

export function Status({
  value,
}: {
  value: string;
}) {
  const tone: ChipTone = [
    "activo",
    "activa",
    "aprobada",
    "resuelto",
    "baja",
  ].includes(value)

    ? "good"

    : [
        "suspendido",
        "rechazada",
        "rechazado",
        "emergencia",
        "alta",
        "vencida",
      ].includes(value)

      ? "danger"

      : "warn";

  return (
    <Chip tone={tone}>

      {text(value)}

    </Chip>
  );
}

/* =========================================
   COMPONENTE PAGE
   Contenedor general administrativo
========================================= */

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-5 pb-4 sm:gap-6">

      {/* Encabezado administrativo */}

      <header className="animate-fade-up relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-slate-950 via-violet-950 to-violet-800 p-5 text-white shadow-lg sm:p-7">

        {/* Decoraciones */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-80 w-80 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-20 h-80 w-80 rounded-full bg-violet-400/10"
        />

        <div className="relative">

          {/* Identificación de sección */}

          <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-200">

            <span>RUTABOL-SCZ</span>

            <ChevronRight
              size={12}
              aria-hidden="true"
            />

            <span>Centro de Control</span>

          </div>

          <div className="flex items-center justify-between gap-4">

            <div className="min-w-0 flex-1">

              <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">

                {title}

              </h1>

              {subtitle && (
                <p className="mt-3 max-w-3xl text-xs leading-relaxed text-violet-100/80 sm:text-sm">

                  {subtitle}

                </p>
              )}

            </div>

            <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/10 text-violet-200 sm:flex">

              <LayoutDashboard
                size={39}
                aria-hidden="true"
              />

            </span>

          </div>

        </div>

      </header>

      {/* Contenido de la página */}

      <div className="animate-fade-up delay-100 flex min-w-0 flex-col gap-5 sm:gap-6">

        {children}

      </div>

    </div>
  );
}

/* =========================================
   COMPONENTE SECTION
   Contenedores administrativos
========================================= */

export function Section({
  title,
  children,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  children: ReactNode;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <section className={`${CARD} p-4 sm:p-6`}>

      {/* Encabezado */}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">

        <div className="flex min-w-0 items-center gap-3">

          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">

              <Icon
                size={21}
                aria-hidden="true"
              />

            </span>
          ) : (
            <span
              aria-hidden="true"
              className="h-6 w-1 shrink-0 rounded-full bg-violet-600"
            />
          )}

          <div className="min-w-0">

            <h2 className="break-words text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">

              {title}

            </h2>

            {description && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">

                {description}

              </p>
            )}

          </div>

        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">

            {actions}

          </div>
        )}

      </div>

      {/* Contenido */}

      {children}

    </section>
  );
}

/* =========================================
   COMPONENTE TABLE
   Tablas administrativas responsive
========================================= */

export function Table({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={caption}
      className="w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
    >

      <table className="w-full text-left text-sm">

        <caption className="sr-only">

          {caption}

        </caption>

        {/* Encabezados de tabla */}

        <thead className="border-b border-violet-100 bg-violet-50/80 text-violet-900">

          <tr>

            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                scope="col"
                className="whitespace-nowrap px-4 py-4 text-[10px] font-extrabold uppercase tracking-wider sm:text-xs"
              >

                {header}

              </th>
            ))}

          </tr>

        </thead>

        {/* Registros de tabla */}

        <tbody className="divide-y divide-slate-100 text-slate-700 [&_td]:px-4 [&_td]:py-4 [&_td]:align-top [&_tr]:transition-colors [&_tr:hover]:bg-violet-50/40">

          {children}

        </tbody>

      </table>

    </div>
  );
}

/* =========================================
   COMPONENTE EMPTY
   Estado sin registros
========================================= */

export function Empty({
  children = "No hay registros para mostrar.",
}: {
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center sm:py-10"
    >

      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-100 bg-white text-violet-500 shadow-sm">

        <Inbox
          size={31}
          aria-hidden="true"
        />

      </span>

      <p className="text-sm font-bold text-slate-700">

        Sin registros disponibles

      </p>

      <div className="mt-2 max-w-md break-words text-xs leading-relaxed text-slate-500 sm:text-sm">

        {children}

      </div>

    </div>
  );
}

/* =========================================
   MENSAJE DE ERROR ADMINISTRATIVO
========================================= */

function CommandError({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
    >

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">

        <AlertCircle
          size={21}
          aria-hidden="true"
        />

      </span>

      <div className="min-w-0 flex-1">

        <p className="text-sm font-bold text-red-900">

          No se pudo completar la operación

        </p>

        <p className="mt-1 break-words text-xs leading-relaxed text-red-700 sm:text-sm">

          {message}

        </p>

      </div>

    </div>
  );
}

/* =========================================
   COMPONENTE QUERYSTATE
   Carga, errores y actualización
========================================= */

export function QueryState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string | null;
  reload: () => unknown;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 print:hidden">

      {/* Estado de consulta */}

      <div className={`${CARD} flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3`}>

        <div className="flex min-w-0 items-center gap-3">

          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              error
                ? "bg-red-50 text-red-600"
                : "bg-violet-50 text-violet-700"
            }`}
          >

            {loading ? (
              <LoaderCircle
                size={19}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : error ? (
              <CircleAlert
                size={19}
                aria-hidden="true"
              />
            ) : (
              <Activity
                size={19}
                aria-hidden="true"
              />
            )}

          </span>

          <div
            role="status"
            className="min-w-0"
          >

            <p className="text-xs font-bold text-slate-800">

              {loading
                ? "Cargando datos..."
                : error
                  ? "Error de consulta"
                  : "Consulta de registros"}

            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">

              {loading
                ? "Consultando información del sistema."
                : error
                  ? "Puedes intentar actualizar nuevamente."
                  : "Actualiza la información cuando lo necesites."}

            </p>

          </div>

        </div>

        {/* Actualización manual */}

        <button
          type="button"
          disabled={loading}
          onClick={() => void reload()}
          className={OUTLINE}
        >

          <RefreshCw
            size={16}
            aria-hidden="true"
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          {loading
            ? "Actualizando..."
            : "Actualizar datos"}

        </button>

      </div>

      {/* Error de consulta */}

      {error && (
        <>

          <CommandError message={error} />

          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">

            <CircleAlert
              size={17}
              aria-hidden="true"
              className="shrink-0"
            />

            Los datos visibles pueden
            estar desactualizados.

          </div>

        </>
      )}

    </div>
  );
}

/* =========================================
   COMPONENTE NOTICE
   Resultado de operaciones
========================================= */

export function Notice({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;

  return (
    <div
      aria-live="polite"
      className="space-y-3"
    >

      {/* Mensaje de error */}

      {error && (
        <CommandError message={error} />
      )}

      {/* Mensaje de éxito */}

      {success && (
        <div
          role="status"
          className="animate-fade-in flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

            <CheckCircle2
              size={21}
              aria-hidden="true"
            />

          </span>

          <div className="min-w-0 flex-1">

            <p className="text-sm font-bold text-emerald-900">

              Operación completada

            </p>

            <p className="mt-1 break-words text-xs leading-relaxed text-emerald-700 sm:text-sm">

              {success}

            </p>

          </div>

        </div>
      )}

    </div>
  );
}

/* =========================================
   COMPONENTE STATCARD
   Indicadores administrativos reutilizables
========================================= */

export function StatCard({
  label,
  value,
  icon: Icon = Activity,
  description,
  tone = "violet",
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  description?: string;
  tone?: MetricTone;
}) {
  return (
    <div className={`${CARD} group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>

      <div className="mb-4 flex items-center justify-between gap-2">

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${METRIC_STYLES[tone]}`}
        >

          <Icon
            size={23}
            aria-hidden="true"
          />

        </span>

        <Activity
          size={18}
          aria-hidden="true"
          className="text-slate-200 transition-colors group-hover:text-violet-300"
        />

      </div>

      <p className="break-words text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">

        {label}

      </p>

      <div className="mt-2 break-words text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">

        {value}

      </div>

      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">

          {description}

        </p>
      )}

    </div>
  );
}

/* =========================================
   HOOK USECOMMAND
   Administración segura de operaciones
========================================= */

export function useCommand() {
  const lock = useRef(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function run(
    path: string,
    method: string,
    body: unknown,
    message: string
  ): Promise<boolean> {

    /*
     * Evita que una operación se ejecute
     * nuevamente mientras sigue pendiente.
     */

    if (lock.current) return false;

    lock.current = true;

    setBusy(true);

    setError(null);

    setSuccess(null);

    try {

      /* Solicitud original a la API */

      const failure = await act(
        path,
        method,
        body
      );

      /* Error devuelto por el servidor */

      if (failure) {
        setError(failure);

        return false;
      }

      /* Operación exitosa */

      setSuccess(message);

      return true;

    } catch (failure) {

      /*
       * Manejo de excepciones inesperadas,
       * problemas de conexión u otros errores.
       */

      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo completar la operación. Revisa tu conexión e inténtalo nuevamente."
      );

      return false;

    } finally {

      /*
       * Liberar el bloqueo sin importar
       * el resultado de la solicitud.
       */

      lock.current = false;

      setBusy(false);
    }
  }

  /*
   * Se conservan exactamente las
   * propiedades originales del hook.
   */

  return {
    busy,
    error,
    success,
    setError,
    setSuccess,
    run,
  };
}
