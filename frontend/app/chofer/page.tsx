
"use client";

import Link from "next/link";

import {
  useRef,
  useState,
} from "react";

import {
  Armchair,
  ArrowRight,
  Ban,
  BusFront,
  CircleAlert,
  Gauge,
  LoaderCircle,
  Minus,
  PauseCircle,
  Play,
  Plus,
  Radio,
  ScanFace,
  ShieldCheck,
  Siren,
  UserMinus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  JornadaCard,
  OccupancyCorrection,
} from "@/components/DriverTools";

import {
  StatusPill,
} from "@/components/pasajero/ui";

import {
  OCC_LABEL,
  RADIUS_KM,
  haversineKm,
  occState,
} from "@/lib/data";

import {
  useApp,
} from "@/lib/store";

/* =========================================
   ESTADOS DE OCUPACIÓN
========================================= */

const BAR: Record<string, string> = {
  disponible: "bg-emerald-500",
  moderado: "bg-lime-600",
  "casi-lleno": "bg-amber-500",
  lleno: "bg-red-500",
};

const OCC_TEXT: Record<string, string> = {
  disponible: "text-emerald-700",
  moderado: "text-lime-700",
  "casi-lleno": "text-amber-700",
  lleno: "text-red-700",
};

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const PRIMARY =
  "group flex min-h-14 items-center justify-center gap-3 rounded-xl bg-blue-700 px-4 py-4 text-sm font-bold text-white transition-all enabled:hover:bg-blue-800 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const OUTLINE =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all enabled:hover:border-blue-300 enabled:hover:bg-blue-50 enabled:hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40";

/* =========================================
   ILUSTRACIÓN DEL MICRO
========================================= */

function BusIllustration() {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      className="h-auto w-full max-w-[200px]"
    >

      <ellipse
        cx="120"
        cy="166"
        rx="103"
        ry="10"
        fill="#020617"
        opacity=".25"
      />

      {/* Espejos */}

      <rect
        x="26"
        y="45"
        width="15"
        height="38"
        rx="6"
        fill="#1e40af"
        stroke="#60a5fa"
        strokeWidth="2"
      />

      <rect
        x="199"
        y="45"
        width="15"
        height="38"
        rx="6"
        fill="#1e40af"
        stroke="#60a5fa"
        strokeWidth="2"
      />

      {/* Cuerpo del micro */}

      <rect
        x="42"
        y="12"
        width="156"
        height="145"
        rx="29"
        fill="#2563eb"
        stroke="#93c5fd"
        strokeWidth="2"
      />

      <rect
        x="49"
        y="19"
        width="142"
        height="132"
        rx="24"
        fill="#3b82f6"
      />

      {/* Identificación superior */}

      <rect
        x="86"
        y="25"
        width="68"
        height="18"
        rx="5"
        fill="#172554"
      />

      <path
        d="M101 34H139"
        stroke="#93c5fd"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Parabrisas */}

      <rect
        x="57"
        y="52"
        width="126"
        height="52"
        rx="8"
        fill="#dbeafe"
      />

      <path
        d="M120 52V104"
        stroke="#2563eb"
        strokeWidth="5"
      />

      <path
        d="M63 91L100 58"
        stroke="#ffffff"
        strokeOpacity=".65"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M131 91L168 58"
        stroke="#ffffff"
        strokeOpacity=".65"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Luces */}

      <rect
        x="58"
        y="117"
        width="30"
        height="13"
        rx="5"
        fill="#ffffff"
      />

      <rect
        x="152"
        y="117"
        width="30"
        height="13"
        rx="5"
        fill="#ffffff"
      />

      {/* Parrilla */}

      <rect
        x="98"
        y="115"
        width="44"
        height="20"
        rx="5"
        fill="#1e3a8a"
      />

      <path
        d="M106 122H134M106 128H134"
        stroke="#93c5fd"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Parachoques */}

      <rect
        x="50"
        y="141"
        width="140"
        height="9"
        rx="4"
        fill="#1e3a8a"
      />

      {/* Ruedas */}

      <rect
        x="58"
        y="150"
        width="28"
        height="19"
        rx="7"
        fill="#0f172a"
      />

      <rect
        x="154"
        y="150"
        width="28"
        height="19"
        rx="7"
        fill="#0f172a"
      />

    </svg>
  );
}

/* =========================================
   INDICADORES ESTADÍSTICOS
========================================= */

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  style,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  style: string;
}) {
  return (
    <div className={`${CARD} p-4 sm:p-5`}>

      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${style}`}
      >

        <Icon
          size={24}
          aria-hidden="true"
        />

      </span>

      <dt className="text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </dt>

      <dd className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
        {value}
      </dd>

      <dd className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {description}
      </dd>

    </div>
  );
}

/* =========================================
   PANEL PRINCIPAL DEL CONDUCTOR
========================================= */

export default function PanelChofer() {
  const {
    profile,
    world,
    registerDisembark,
    setMax,
    resumeService,
    dismissAlert,
  } = useApp();

  /* =====================================
     ESTADOS DE LA INTERFAZ
  ===================================== */

  const [msg, setMsg] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState<
      "aforo" | "bajada" | "resume" | null
    >(null);

  const lock = useRef(false);

  /* =====================================
     UNIDAD ASIGNADA
  ===================================== */

  const bus = world.buses.find(
    (item) =>
      item.id === profile?.busId
  );

  /* =====================================
     SIN UNIDAD DISPONIBLE
  ===================================== */

  if (!bus) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">

        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">

          <BusFront
            size={40}
            aria-hidden="true"
          />

        </span>

        <h1 className="text-xl font-bold text-slate-900">
          Unidad no disponible
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">

          No encontramos la unidad asociada
          a tu sesión. Verifica tu acceso
          o contacta con el Centro de Control.

        </p>

      </div>
    );
  }

  /* =====================================
     INFORMACIÓN OPERATIVA
  ===================================== */

  const pending = world.reqs.filter(
    (request) =>
      request.busId === bus.id
  ).length;

  const state = occState(
    bus.occupancy,
    bus.max
  );

  const full = state === "lleno";

  const available = Math.max(
    0,
    bus.max - bus.occupancy
  );

  const percentage = Math.max(
    0,
    Math.min(
      100,
      (bus.occupancy /
        Math.max(1, bus.max)) *
        100
    )
  );

  const tone = full
    ? "danger"
    : state === "casi-lleno"
      ? "warn"
      : "success";

  /* =====================================
     ALERTAS DE UNIDADES CERCANAS
  ===================================== */

  const alerts = world.alerts.filter(
    (alert) => {
      if (
        (alert.kind ?? "emergencia") ===
        "aforo"
      ) {
        return false;
      }

      if (alert.busId === bus.id) {
        return false;
      }

      const affectedBus =
        world.buses.find(
          (item) =>
            item.id === alert.busId
        );

      /*
       * Evita errores cuando una alerta
       * pertenece a una unidad que ya
       * no está disponible.
       */

      if (!affectedBus) {
        return false;
      }

      return (
        haversineKm(
          affectedBus.pos,
          bus.pos
        ) <= RADIUS_KM
      );
    }
  );

  /* =====================================
     PROTECCIÓN DE OPERACIONES
  ===================================== */

  async function runAction(
    type: "aforo" | "bajada" | "resume",
    action: () => unknown | Promise<unknown>
  ) {
    if (lock.current) return;

    lock.current = true;

    setBusy(type);

    setMsg(null);

    try {
      const result = await action();

      /*
       * setMax devuelve un mensaje
       * de error o null.
       */

      if (
        typeof result === "string" &&
        result.length > 0
      ) {
        setMsg(result);
      }

    } catch (failure) {
      setMsg(
        failure instanceof Error
          ? failure.message
          : "No se pudo completar la operación. Inténtalo nuevamente."
      );

    } finally {
      lock.current = false;

      setBusy(null);
    }
  }

  /* =====================================
     MODIFICAR AFORO MÁXIMO
  ===================================== */

  function changeCapacity(value: number) {
    if (!bus) return;

    if (
      value < 18 ||
      value > 25
    ) {
      return;
    }

    void runAction(
      "aforo",
      () => setMax(bus.id, value)
    );
  }

  /* =====================================
     REGISTRAR BAJADA DE PASAJERO
  ===================================== */

  function disembark() {
    if (
      !bus ||
      bus.occupancy <= 0
    ) {
      return;
    }

    void runAction(
      "bajada",
      () => registerDisembark(bus.id)
    );
  }

  /* =====================================
     REANUDAR SERVICIO
  ===================================== */

  function resume() {
    if (!bus) return;

    void runAction(
      "resume",
      () => resumeService(bus.id)
    );
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-5 pb-4 sm:gap-6">

      {/* =================================
          ENCABEZADO
      ================================= */}

      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">

            <BusFront
              size={29}
              aria-hidden="true"
            />

          </span>

          <div className="min-w-0">

            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">

              Operaciones de transporte

            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">

              Panel del conductor

            </h1>

            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">

              Administra tu unidad, aforo
              y validación de pasajeros.

            </p>

          </div>

        </div>

        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-xs font-semibold text-blue-800">

          <ShieldCheck
            size={18}
            aria-hidden="true"
          />

          Portal operativo

        </div>

      </div>

      {/* =================================
          TARJETA DE LA UNIDAD
      ================================= */}

      <section
        aria-label="Unidad asignada"
        className="animate-fade-up relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-xl sm:p-8"
      >

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
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-500/10"
        />

        <div className="relative flex items-center justify-between gap-4">

          <div className="min-w-0 flex-1">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">

              Unidad asignada

            </p>

            <h2 className="mt-3 break-words text-3xl font-extrabold tracking-tight sm:text-5xl">

              Línea {bus.line}

            </h2>

            <p className="mt-3 text-sm font-medium text-blue-100 sm:text-base">

              Interno {bus.internal}

            </p>

            {bus.plate && (
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2">

                <span className="text-[10px] uppercase tracking-wide text-blue-200">

                  Placa

                </span>

                <span className="break-all text-xs font-bold tracking-widest text-white">

                  {bus.plate}

                </span>

              </div>
            )}

          </div>

          {/* Ilustración */}

          <div className="w-[100px] shrink-0 sm:w-[170px] lg:w-[210px]">

            <BusIllustration />

          </div>

        </div>

        {/* Información del conductor */}

        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">

          <div className="flex items-center gap-2 text-xs text-blue-100">

            <Radio
              size={17}
              aria-hidden="true"
              className="text-blue-300"
            />

            Control de unidad

          </div>

          <span className="text-xs font-extrabold tracking-wide">

            RUTABOL-SCZ

          </span>

        </div>

      </section>

      {/* =================================
          CONTROL DE JORNADA ORIGINAL
      ================================= */}

      <div className="animate-fade-up delay-100">

        <JornadaCard bus={bus} />

      </div>

      {/* =================================
          ALERTAS DE EMERGENCIA
      ================================= */}

      {alerts.length > 0 && (
        <section
          aria-label="Emergencias cercanas"
          className="space-y-3"
        >

          {alerts.map((alert) => (
            <div
              key={alert.id}
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
            >

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">

                <Siren
                  size={25}
                  aria-hidden="true"
                />

              </span>

              <div className="min-w-0 flex-1">

                <h3 className="text-sm font-bold text-red-900">

                  Emergencia de una unidad cercana

                </h3>

                <p className="mt-2 text-xs leading-relaxed text-red-800 sm:text-sm">

                  Unidad{" "}

                  <strong>

                    {alert.busId.replace(
                      "-",
                      " / "
                    )}

                  </strong>

                  {" "}dentro de tu radio de operación.
                  Puedes recibir sus pasajeros
                  mediante Trasbordos.

                </p>

                <Link
                  href="/chofer/trasbordo"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition-colors hover:bg-red-700"
                >

                  Ir a Trasbordos

                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                  />

                </Link>

              </div>

              <button
                type="button"
                aria-label="Cerrar alerta"
                title="Cerrar alerta"
                onClick={() =>
                  dismissAlert(alert.id)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-100"
              >

                <X
                  size={20}
                  aria-hidden="true"
                />

              </button>

            </div>
          ))}

        </section>
      )}

      {/* =================================
          UNIDAD EN DESCANSO
      ================================= */}

      {bus.status === "descanso" && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">

          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">

            <PauseCircle
              size={26}
              aria-hidden="true"
            />

          </span>

          <div className="min-w-[160px] flex-1">

            <h3 className="text-sm font-bold text-amber-900">

              Unidad en descanso

            </h3>

            <p className="mt-1 text-xs leading-relaxed text-amber-800">

              Tu unidad no aparece en el mapa
              de pasajeros mientras se encuentra
              en descanso.

            </p>

          </div>

          <button
            type="button"
            disabled={busy !== null}
            onClick={resume}
            className={`${PRIMARY} w-full sm:w-auto`}
          >

            {busy === "resume" ? (
              <LoaderCircle
                size={20}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <Play
                size={20}
                aria-hidden="true"
              />
            )}

            {busy === "resume"
              ? "Reanudando..."
              : "Reanudar servicio"}

          </button>

        </section>
      )}

      {/* =================================
          EMERGENCIA ACTIVA
      ================================= */}

      {bus.status === "emergencia" && (
        <section
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5"
        >

          <Siren
            size={28}
            aria-hidden="true"
            className="shrink-0 text-red-700"
          />

          <div className="min-w-[160px] flex-1">

            <p className="text-sm font-bold text-red-900">

              Emergencia activa

            </p>

            <p className="mt-2 text-xs leading-relaxed text-red-800">

              Gestiona el traslado de pasajeros
              desde la sección de Trasbordos.

            </p>

          </div>

          <Link
            href="/chofer/trasbordo"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition-colors hover:bg-red-700"
          >

            Gestionar trasbordos

            <ArrowRight
              size={16}
              aria-hidden="true"
            />

          </Link>

        </section>
      )}

      {/* =================================
          INDICADORES OPERATIVOS
      ================================= */}

      <dl className="animate-fade-up delay-200 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">

        <StatCard
          icon={Users}
          label="Pasajeros a bordo"
          value={`${bus.occupancy}/${bus.max}`}
          description="Ocupación actual de la unidad."
          style="bg-blue-50 text-blue-700"
        />

        <StatCard
          icon={Armchair}
          label="Plazas disponibles"
          value={String(available)}
          description={`Capacidad máxima de ${bus.max} pasajeros.`}
          style="bg-emerald-50 text-emerald-700"
        />

        <div className="col-span-2 lg:col-span-1">

          <StatCard
            icon={ScanFace}
            label="Validaciones pendientes"
            value={String(pending)}
            description="Solicitudes de pasajeros para esta unidad."
            style="bg-amber-50 text-amber-700"
          />

        </div>

      </dl>

      {/* =================================
          OCUPACIÓN DE LA UNIDAD
      ================================= */}

      <section className={`${CARD} animate-fade-up delay-200 p-5 sm:p-7`}>

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

              <Gauge
                size={25}
                aria-hidden="true"
              />

            </span>

            <div>

              <h2 className="text-base font-bold text-slate-900 sm:text-lg">

                Ocupación de la unidad

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Capacidad y disponibilidad actual.

              </p>

            </div>

          </div>

          <StatusPill tone={tone}>

            {OCC_LABEL[state]}

          </StatusPill>

        </div>

        {/* Contador de pasajeros */}

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">

              Pasajeros a bordo

            </p>

            <p className="mt-2 text-5xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-6xl">

              {bus.occupancy}

              <span className="ml-2 text-2xl font-semibold text-slate-400 sm:text-3xl">

                / {bus.max}

              </span>

            </p>

          </div>

          <div className="text-right">

            <p
              className={`text-3xl font-extrabold tabular-nums ${
                OCC_TEXT[state] ??
                "text-slate-700"
              }`}
            >

              {Math.round(percentage)}%

            </p>

            <p className="mt-1 text-[11px] text-slate-500">

              De capacidad

            </p>

          </div>

        </div>

        {/* Barra de ocupación */}

        <div
          role="progressbar"
          aria-label="Ocupación de la unidad"
          aria-valuemin={0}
          aria-valuemax={
            Math.max(1, bus.max)
          }
          aria-valuenow={
            Math.max(
              0,
              Math.min(
                bus.occupancy,
                Math.max(1, bus.max)
              )
            )
          }
          className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-100"
        >

          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              BAR[state] ??
              "bg-blue-600"
            }`}
            style={{
              width: `${percentage}%`,
            }}
          />

        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">

          <span>0 pasajeros</span>

          <span>{bus.max} pasajeros</span>

        </div>

        {/* Plazas disponibles */}

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-600">

          <Armchair
            size={18}
            aria-hidden="true"
            className="shrink-0 text-blue-700"
          />

          {available === 0
            ? "No quedan plazas disponibles."
            : `${available} plazas disponibles en la unidad.`}

        </div>

      </section>

      {/* =================================
          UNIDAD LLENA
      ================================= */}

      {full && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
        >

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">

            <Ban
              size={24}
              aria-hidden="true"
            />

          </span>

          <div>

            <p className="text-sm font-bold text-red-900">

              Unidad llena

            </p>

            <p className="mt-1 text-xs leading-relaxed text-red-800 sm:text-sm">

              La admisión de nuevos pasajeros
              está bloqueada y el mapa muestra
              la unidad como Lleno.

            </p>

          </div>

        </div>
      )}

      {/* =================================
          MENSAJES DE OPERACIONES
      ================================= */}

      {msg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >

          <CircleAlert
            size={21}
            aria-hidden="true"
            className="shrink-0"
          />

          <p className="flex-1 text-sm leading-relaxed">

            {msg}

          </p>

          <button
            type="button"
            onClick={() => setMsg(null)}
            aria-label="Cerrar mensaje"
            className="rounded-md p-1 hover:bg-red-100"
          >

            <X
              size={17}
              aria-hidden="true"
            />

          </button>

        </div>
      )}

      {/* =================================
          CONTROLES OPERATIVOS
      ================================= */}

      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-2">

        {/* =================================
            CONTROL DE PASAJEROS
        ================================= */}

        <section className={`${CARD} flex flex-col p-5 sm:p-6`}>

          <div className="flex items-center gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

              <Users
                size={25}
                aria-hidden="true"
              />

            </span>

            <div>

              <h2 className="text-lg font-bold tracking-tight text-slate-900">

                Control de pasajeros

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Gestiona el ingreso y la salida.

              </p>

            </div>

          </div>

          <div className="mt-6 flex flex-1 flex-col gap-3">

            {/* Validación de pasajeros */}

            <Link
              href="/chofer/validacion"
              className="group flex min-h-[92px] items-center gap-4 rounded-2xl bg-linear-to-br from-blue-700 to-blue-900 p-4 text-white shadow-sm transition-all hover:shadow-lg"
            >

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">

                <ScanFace
                  size={27}
                  aria-hidden="true"
                />

              </span>

              <span className="min-w-0 flex-1">

                <span className="block text-sm font-bold sm:text-base">

                  Validar pasajeros

                </span>

                <span className="mt-1 block text-xs text-blue-200">

                  {pending} solicitudes pendientes

                </span>

              </span>

              <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 px-2 text-sm font-bold tabular-nums">

                {pending}

              </span>

              <ArrowRight
                size={19}
                aria-hidden="true"
                className="hidden shrink-0 transition-transform group-hover:translate-x-1 sm:block"
              />

            </Link>

            {/* Bajada de pasajero */}

            <button
              type="button"
              disabled={
                bus.occupancy <= 0 ||
                busy !== null
              }
              onClick={disembark}
              className="group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all enabled:hover:border-blue-300 enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                {busy === "bajada" ? (
                  <LoaderCircle
                    size={26}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : (
                  <UserMinus
                    size={26}
                    aria-hidden="true"
                  />
                )}

              </span>

              <span className="min-w-0 flex-1">

                <span className="block text-sm font-bold text-slate-900 sm:text-base">

                  {busy === "bajada"
                    ? "Registrando..."
                    : "Bajó un pasajero"}

                </span>

                <span className="mt-1 block text-xs text-slate-500">

                  Disminuir la ocupación en una plaza.

                </span>

              </span>

              <Minus
                size={22}
                aria-hidden="true"
                className="shrink-0 text-blue-700"
              />

            </button>

          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">

            Utiliza estos controles para mantener
            actualizado el número de pasajeros
            de tu unidad.

          </p>

        </section>

        {/* =================================
            CONFIGURACIÓN DE AFORO
        ================================= */}

        <section className={`${CARD} flex flex-col p-5 sm:p-6`}>

          <div className="flex items-center gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

              <Gauge
                size={25}
                aria-hidden="true"
              />

            </span>

            <div>

              <h2 className="text-lg font-bold tracking-tight text-slate-900">

                Aforo máximo

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Configura la capacidad de tu unidad.

              </p>

            </div>

          </div>

          {/* Selector de capacidad */}

          <div className="my-6 flex flex-1 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">

            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">

              Capacidad configurada

            </p>

            <div className="flex items-center justify-center gap-4 sm:gap-6">

              {/* Disminuir capacidad */}

              <button
                type="button"
                aria-label="Reducir aforo"
                title="Reducir aforo"
                disabled={
                  bus.max <= 18 ||
                  busy !== null
                }
                onClick={() =>
                  changeCapacity(bus.max - 1)
                }
                className={`${OUTLINE} h-14 w-14 shrink-0 p-0 text-blue-700`}
              >

                <Minus
                  size={27}
                  aria-hidden="true"
                />

              </button>

              {/* Capacidad actual */}

              <div className="min-w-[80px] text-center">

                <p className="text-5xl font-extrabold tracking-tight tabular-nums text-blue-950">

                  {bus.max}

                </p>

                <p className="mt-1 text-[11px] text-slate-500">

                  Pasajeros

                </p>

              </div>

              {/* Aumentar capacidad */}

              <button
                type="button"
                aria-label="Aumentar aforo"
                title="Aumentar aforo"
                disabled={
                  bus.max >= 25 ||
                  busy !== null
                }
                onClick={() =>
                  changeCapacity(bus.max + 1)
                }
                className={`${OUTLINE} h-14 w-14 shrink-0 p-0 text-blue-700`}
              >

                <Plus
                  size={27}
                  aria-hidden="true"
                />

              </button>

            </div>

            {/* Indicador del rango */}

            <div className="mt-6">

              <div className="flex items-center justify-between text-xs font-medium text-slate-500">

                <span>Mín. 18</span>

                <span>Máx. 25</span>

              </div>

              <div className="mt-3 grid grid-cols-8 gap-1.5">

                {Array.from(
                  { length: 8 },
                  (_, index) => 18 + index
                ).map((value) => (
                  <span
                    key={value}
                    aria-hidden="true"
                    className={`h-2 rounded-full transition-colors ${
                      value <= bus.max
                        ? "bg-blue-600"
                        : "bg-slate-200"
                    }`}
                  />
                ))}

              </div>

            </div>

            {busy === "aforo" && (
              <p
                role="status"
                className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-blue-700"
              >

                <LoaderCircle
                  size={16}
                  aria-hidden="true"
                  className="animate-spin"
                />

                Actualizando capacidad...

              </p>
            )}

          </div>

          {/* Información del aforo */}

          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">

            <CircleAlert
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <p className="text-xs leading-relaxed text-blue-800">

              La capacidad permitida por el sistema
              es de 18 a 25 pasajeros por unidad.

            </p>

          </div>

        </section>

      </div>

      {/* =================================
          CORRECCIÓN DE OCUPACIÓN
      ================================= */}

      <section className="animate-fade-up space-y-3">

        <div className="flex items-center gap-3">

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

            <Users
              size={21}
              aria-hidden="true"
            />

          </span>

          <div>

            <h2 className="text-base font-bold text-slate-900">

              Ajustes de ocupación

            </h2>

            <p className="mt-1 text-xs text-slate-500">

              Herramientas de corrección del aforo.

            </p>

          </div>

        </div>

        {/* Se conserva el componente original */}

        <OccupancyCorrection bus={bus} />

      </section>

      {/* =================================
          INFORMACIÓN OPERATIVA
      ================================= */}

      <div className="flex items-center justify-center gap-2 py-3 text-center text-[11px] text-slate-400">

        <ShieldCheck
          size={16}
          aria-hidden="true"
          className="shrink-0 text-blue-600"
        />

        RUTABOL-SCZ · Operaciones de transporte urbano

      </div>

    </div>
  );
}
