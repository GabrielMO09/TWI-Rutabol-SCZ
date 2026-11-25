
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Info,
  LoaderCircle,
  MapPinned,
  Minus,
  Plus,
  Power,
  Radio,
  Satellite,
  Save,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  ErrorState,
} from "@/components/pasajero/ui";

import { act } from "@/lib/api";

import {
  useApp,
  type Bus,
} from "@/lib/store";

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const PRIMARY =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-all enabled:hover:bg-blue-900 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const OUTLINE =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors enabled:hover:border-blue-300 enabled:hover:bg-blue-50 enabled:hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40";

const DANGER =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition-colors enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

const INPUT =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";

const GPS_INTERVAL = 8000;

/* =========================================
   ENCABEZADO DE COMPONENTES
========================================= */

function SectionHeader({
  icon: Icon,
  title,
  description,
  id,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">

      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">

        <Icon
          size={24}
          aria-hidden="true"
        />

      </span>

      <div className="min-w-0">

        <h2
          id={id}
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          {title}
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">

          {description}

        </p>

      </div>

    </div>
  );
}

/* =========================================
   FORMATO DE HORA
========================================= */

function formatTime(value: number) {
  return new Date(value).toLocaleTimeString(
    "es-BO",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

/* =========================================
   CONTROL DE JORNADA LABORAL

   RF-15:
   Inicio de jornada con GPS válido.

   RNF-02:
   Intervalo mínimo de envío de 8 segundos.
========================================= */

export function JornadaCard({
  bus,
}: {
  bus: Bus;
}) {
  const { world, refresh } = useApp();

  const onDuty =
    world.jornada?.onDuty ??
    bus.onDuty ??
    false;

  /* =====================================
     ESTADOS DE LA JORNADA
  ===================================== */

  const [gps, setGps] =
    useState(false);

  const [msg, setMsg] =
    useState<string | null>(null);

  const [gpsError, setGpsError] =
    useState<string | null>(null);

  const [last, setLast] =
    useState<number | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [confirmEnd, setConfirmEnd] =
    useState(false);

  const [gpsPending, setGpsPending] =
    useState(false);

  const lastSent = useRef(0);

  const lock = useRef(false);

  const gpsRequest = useRef(false);

  const mounted = useRef(false);

  /* =====================================
     CONTROL DEL CICLO DE VIDA
  ===================================== */

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  /* =====================================
     SEGUIMIENTO GPS EN TIEMPO REAL
  ===================================== */

  useEffect(() => {
    if (!onDuty || !gps) return;

    if (!navigator.geolocation) {
      setGpsError(
        "Tu navegador no permite geolocalización."
      );

      return;
    }

    let active = true;

    lastSent.current = 0;

    const id =
      navigator.geolocation.watchPosition(

        async (position) => {

          if (!active) return;

          const now = Date.now();

          /*
           * No enviar una nueva posición
           * antes de los 8 segundos.
           */

          if (
            now - lastSent.current <
            GPS_INTERVAL
          ) {
            return;
          }

          /*
           * Evitar solicitudes GPS
           * simultáneas.
           */

          if (gpsRequest.current) {
            return;
          }

          lastSent.current = now;

          gpsRequest.current = true;

          setGpsPending(true);

          try {
            const error = await act(
              `/micros/${bus.id}/location`,
              "POST",
              {
                lat:
                  position.coords.latitude,

                lng:
                  position.coords.longitude,

                accuracy:
                  position.coords.accuracy,
              }
            );

            if (!active) return;

            setGpsError(error);

            if (!error) {
              setLast(Date.now());
            }

          } catch {
            if (active) {
              setGpsError(
                "No se pudo enviar tu ubicación. Revisa la conexión."
              );
            }

          } finally {
            gpsRequest.current = false;

            if (active) {
              setGpsPending(false);
            }
          }
        },

        () => {
          if (active) {
            setGpsError(
              "No se pudo obtener el GPS. Revisa los permisos del navegador."
            );
          }
        },

        {
          enableHighAccuracy: true,

          maximumAge: 5000,

          timeout: 15000,
        }
      );

    /*
     * Detener el seguimiento al cerrar
     * jornada, desactivar GPS o desmontar
     * el componente.
     */

    return () => {
      active = false;

      navigator.geolocation.clearWatch(id);
    };

  }, [
    onDuty,
    gps,
    bus.id,
  ]);

  /* =====================================
     ACTIVAR O DESACTIVAR GPS
  ===================================== */

  function toggleGps(enabled: boolean) {
    if (lock.current) return;

    if (
      enabled &&
      !navigator.geolocation
    ) {
      setGpsError(
        "Tu navegador no permite geolocalización."
      );

      return;
    }

    setGpsError(null);

    setGpsPending(false);

    setLast(null);

    setGps(enabled);
  }

  /* =====================================
     INICIAR O CERRAR JORNADA
  ===================================== */

  async function toggle() {
    if (lock.current) return;

    lock.current = true;

    setBusy(true);

    setMsg(null);

    try {
      let body:
        | {
            lat: number;
            lng: number;
          }
        | undefined;

      /* =================================
         OBTENER GPS ANTES DE INICIAR
      ================================= */

      if (!onDuty) {
        if (!navigator.geolocation) {
          setMsg(
            "Tu navegador no permite geolocalización."
          );

          return;
        }

        const position =
          await new Promise<
            GeolocationPosition | null
          >((resolve) => {
            navigator.geolocation.getCurrentPosition(

              resolve,

              () => resolve(null),

              {
                enableHighAccuracy: true,

                timeout: 15000,
              }
            );
          });

        if (!mounted.current) return;

        if (!position) {
          setMsg(
            "Activa el GPS y concede el permiso para iniciar la jornada."
          );

          return;
        }

        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180
        ) {
          setMsg(
            "No se obtuvo una posición GPS válida."
          );

          return;
        }

        body = { lat, lng };
      }

      /* =================================
         SOLICITUD ORIGINAL AL BACKEND
      ================================= */

      const error = await act(

        onDuty
          ? "/jornada/end"
          : "/jornada/start",

        "POST",

        body
      );

      if (!mounted.current) return;

      if (error) {
        setMsg(error);

        return;
      }

      /*
       * Iniciar GPS después de abrir
       * correctamente la jornada.
       */

      setGps(!onDuty);

      setLast(null);

      setGpsError(null);

      setGpsPending(false);

      setConfirmEnd(false);

      lastSent.current = 0;

      try {
        await refresh();

      } catch {
        if (mounted.current) {
          setMsg(
            "La jornada se actualizó, pero no pudimos refrescar los datos mostrados."
          );
        }
      }

    } catch (failure) {
      if (mounted.current) {
        setMsg(
          failure instanceof Error
            ? failure.message
            : "No se pudo completar la operación."
        );
      }

    } finally {
      lock.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  /* =====================================
     ESTADO VISUAL DEL GPS
  ===================================== */

  const realLocation =
    bus.source === "gps";

  const gpsStatus = !gps
    ? "Desactivado"
    : gpsError
      ? "Revisar conexión"
      : gpsPending
        ? "Enviando ubicación"
        : last
          ? "Ubicación enviada"
          : "Obteniendo ubicación";

  /* =====================================
     INTERFAZ DE JORNADA
  ===================================== */

  return (
    <section
      aria-labelledby="jor"
      aria-busy={busy}
      className={`${CARD} overflow-hidden`}
    >

      {/* =================================
          ENCABEZADO
      ================================= */}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">

        <SectionHeader
          id="jor"
          icon={CalendarClock}
          title="Jornada laboral"
          description={`Línea ${bus.line} · Interno ${bus.internal}${bus.plate ? ` · ${bus.plate}` : ""}`}
        />

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
            onDuty
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >

          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${
              onDuty
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          />

          {onDuty
            ? "En servicio"
            : "Fuera de servicio"}

        </span>

      </div>

      {/* =================================
          CONTENIDO PRINCIPAL
      ================================= */}

      <div className="space-y-5 p-5 sm:p-6">

        {/* =================================
            JORNADA INACTIVA
        ================================= */}

        {!onDuty && (
          <>

            <div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-blue-50/60 p-6 text-center">

              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">

                <Power
                  size={32}
                  aria-hidden="true"
                />

              </span>

              <h3 className="text-base font-bold text-blue-950">

                Comienza tu jornada

              </h3>

              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">

                Inicia el servicio para habilitar
                tu unidad dentro del sistema de
                transporte.

              </p>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700">

                <MapPinned
                  size={17}
                  aria-hidden="true"
                />

                Requiere una posición GPS válida

              </div>

            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void toggle()}
              className={`${PRIMARY} w-full`}
            >

              {busy ? (
                <LoaderCircle
                  size={21}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Power
                  size={21}
                  aria-hidden="true"
                />
              )}

              {busy
                ? "Iniciando jornada..."
                : "Iniciar jornada"}

            </button>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">

              <Info
                size={17}
                aria-hidden="true"
                className="shrink-0 text-blue-600"
              />

              Mientras no estés en servicio,
              tu unidad no aparece en el mapa
              público.

            </p>

          </>
        )}

        {/* =================================
            JORNADA ACTIVA
        ================================= */}

        {onDuty && (
          <>

            {/* Control de ubicación */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

              <label className="flex cursor-pointer items-center gap-3">

                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  gps
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}>

                  <Satellite
                    size={25}
                    aria-hidden="true"
                  />

                </span>

                <span className="min-w-0 flex-1">

                  <span className="block text-sm font-bold text-slate-900">

                    Compartir ubicación GPS

                  </span>

                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">

                    Envía tu posición al sistema
                    durante el servicio.

                  </span>

                </span>

                {/* Interruptor accesible */}

                <span className="relative inline-flex shrink-0 items-center">

                  <input
                    type="checkbox"
                    role="switch"
                    checked={gps}
                    disabled={busy}
                    onChange={(event) =>
                      toggleGps(
                        event.target.checked
                      )
                    }
                    className="peer sr-only"
                  />

                  <span
                    aria-hidden="true"
                    className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200 peer-disabled:opacity-50"
                  />

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                  />

                </span>

              </label>

              {/* Estado del seguimiento */}

              <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <span className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <Radio
                      size={15}
                      aria-hidden="true"
                    />

                    Estado del envío

                  </span>

                  <span
                    role="status"
                    className={`text-xs font-bold ${
                      gpsError
                        ? "text-red-600"
                        : gps
                          ? "text-blue-700"
                          : "text-slate-500"
                    }`}
                  >

                    {gpsStatus}

                  </span>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">

                  <span className="flex items-center gap-2 text-xs text-slate-500">

                    <MapPinned
                      size={15}
                      aria-hidden="true"
                    />

                    Fuente del mapa

                  </span>

                  <span
                    className={`text-xs font-bold ${
                      realLocation
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >

                    {realLocation
                      ? "GPS real"
                      : "Posición simulada"}

                  </span>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">

                  <span className="flex items-center gap-2 text-xs text-slate-500">

                    <Activity
                      size={15}
                      aria-hidden="true"
                    />

                    Intervalo mínimo

                  </span>

                  <span className="text-xs font-bold text-slate-700">

                    8 segundos

                  </span>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">

                  <span className="flex items-center gap-2 text-xs text-slate-500">

                    <Clock
                      size={15}
                      aria-hidden="true"
                    />

                    Último envío exitoso

                  </span>

                  <span className="text-xs font-bold tabular-nums text-slate-700">

                    {last
                      ? formatTime(last)
                      : "Sin envío registrado"}

                  </span>

                </div>

              </div>

              {/* Información del GPS */}

              <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">

                {gps ? (
                  <MapPinned
                    size={17}
                    aria-hidden="true"
                    className="shrink-0 text-blue-700"
                  />
                ) : (
                  <WifiOff
                    size={17}
                    aria-hidden="true"
                    className="shrink-0 text-amber-600"
                  />
                )}

                <p>

                  {gps
                    ? "Mantén habilitados los permisos de ubicación para enviar las coordenadas de tu unidad."
                    : "El envío de coordenadas desde este panel está desactivado. Sin GPS disponible, el sistema utiliza posiciones simuladas."}

                </p>

              </div>

            </div>

            {/* Errores independientes del GPS */}

            {gpsError && (
              <ErrorState message={gpsError} />
            )}

            {/* =================================
                CIERRE DE JORNADA
            ================================= */}

            {!confirmEnd ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmEnd(true)
                }
                className={`${DANGER} w-full`}
              >

                <Power
                  size={20}
                  aria-hidden="true"
                />

                Cerrar jornada

              </button>
            ) : (
              <div className="animate-fade-in space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4">

                <div className="flex items-start gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">

                    <Power
                      size={22}
                      aria-hidden="true"
                    />

                  </span>

                  <div>

                    <h3 className="text-sm font-bold text-red-900">

                      ¿Finalizar tu jornada?

                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-red-800">

                      Se solicitará el cierre de
                      tu jornada y se detendrá el
                      envío de ubicación si la
                      operación se completa.

                    </p>

                  </div>

                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmEnd(false)
                    }
                    className={OUTLINE}
                  >

                    Cancelar

                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void toggle()
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white enabled:hover:bg-red-700 disabled:opacity-50"
                  >

                    {busy ? (
                      <LoaderCircle
                        size={18}
                        aria-hidden="true"
                        className="animate-spin"
                      />
                    ) : (
                      <Power
                        size={18}
                        aria-hidden="true"
                      />
                    )}

                    {busy
                      ? "Finalizando..."
                      : "Confirmar cierre"}

                  </button>

                </div>

              </div>
            )}

          </>
        )}

        {/* Error de operaciones de jornada */}

        {msg && (
          <ErrorState message={msg} />
        )}

      </div>

    </section>
  );
}

/* =========================================
   CONFIGURACIÓN DE LA BITÁCORA
========================================= */

function eventStyle(
  from: number,
  to: number
): {
  icon: LucideIcon;
  style: string;
  amount: string;
} {
  const difference = to - from;

  if (difference > 0) {
    return {
      icon: UserPlus,

      style:
        "bg-emerald-50 text-emerald-700",

      amount: `+${difference}`,
    };
  }

  if (difference < 0) {
    return {
      icon: UserMinus,

      style:
        "bg-amber-50 text-amber-700",

      amount: String(difference),
    };
  }

  return {
    icon: Wrench,

    style:
      "bg-blue-50 text-blue-700",

    amount: "0",
  };
}

/* =========================================
   CORRECCIÓN DE OCUPACIÓN
========================================= */

export function OccupancyCorrection({
  bus,
}: {
  bus: Bus;
}) {
  const { world, refresh } = useApp();

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [draft, setDraft] =
    useState<string | null>(null);

  const [reason, setReason] =
    useState("");

  const [msg, setMsg] =
    useState<string | null>(null);

  const [ok, setOk] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [confirmation, setConfirmation] =
    useState<{
      occupancy: number;
      previous: number;
      reason: string;
    } | null>(null);

  const lock = useRef(false);

  /*
   * Si el conductor aún no ha editado
   * el conteo, utilizar el valor actual
   * recibido desde el sistema.
   */

  const value =
    draft ?? String(bus.occupancy);

  const numericValue = Number(value);

  const validCount =
    value.trim() !== "" &&
    Number.isInteger(numericValue) &&
    numericValue >= 0;

  const validReason =
    reason.trim().length >= 5;

  const difference = validCount
    ? numericValue - bus.occupancy
    : 0;

  /* =====================================
     CAMBIAR EL CONTEO
  ===================================== */

  function updateValue(next: string) {
    if (lock.current) return;

    setDraft(next);

    setConfirmation(null);

    setMsg(null);

    setOk(false);
  }

  /* =====================================
     PREPARAR CONFIRMACIÓN
  ===================================== */

  function prepare(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (lock.current) return;

    setMsg(null);

    setOk(false);

    if (!validCount) {
      setMsg(
        "El conteo debe ser un entero mayor o igual a 0."
      );

      return;
    }

    if (!validReason) {
      setMsg(
        "Escribe el motivo de la corrección (mínimo 5 caracteres)."
      );

      return;
    }

    setConfirmation({
      occupancy: numericValue,

      previous: bus.occupancy,

      reason,
    });
  }

  /* =====================================
     REGISTRAR CORRECCIÓN
  ===================================== */

  async function submit() {
    if (
      lock.current ||
      !confirmation
    ) {
      return;
    }

    /*
     * Si el conteo cambió después
     * de mostrar la confirmación,
     * solicitar una nueva revisión.
     */

    if (
      bus.occupancy !==
      confirmation.previous
    ) {
      setConfirmation(null);

      setMsg(
        "El conteo actual cambió. Revisa los valores antes de confirmar la corrección."
      );

      return;
    }

    lock.current = true;

    setBusy(true);

    setMsg(null);

    setOk(false);

    try {
      const error = await act(

        `/micros/${bus.id}/occupancy/correct`,

        "POST",

        {
          occupancy:
            confirmation.occupancy,

          reason:
            confirmation.reason,
        }
      );

      if (error) {
        setMsg(error);

        return;
      }

      setOk(true);

      setReason("");

      setConfirmation(null);

      setDraft(
        String(confirmation.occupancy)
      );

      try {
        await refresh();

        setDraft(null);

      } catch {
        setMsg(
          "La corrección se registró, pero no se pudieron actualizar los datos mostrados."
        );
      }

    } catch (failure) {
      setMsg(
        failure instanceof Error
          ? failure.message
          : "No se pudo registrar la corrección."
      );

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     LIMPIAR FORMULARIO
  ===================================== */

  function reset() {
    if (lock.current) return;

    setDraft(null);

    setReason("");

    setMsg(null);

    setOk(false);

    setConfirmation(null);
  }

  /* =====================================
     ORDENAR MOVIMIENTOS

     Se utiliza una copia para no alterar
     el estado original de world.
  ===================================== */

  const events = [
    ...world.occupancyEvents,
  ].sort(
    (a, b) => b.at - a.at
  );

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

      {/* =================================
          FORMULARIO DE CORRECCIÓN
      ================================= */}

      <form
        onSubmit={prepare}
        aria-labelledby="corr"
        aria-busy={busy}
        className={`${CARD} overflow-hidden`}
      >

        <div className="border-b border-slate-100 p-5 sm:p-6">

          <SectionHeader
            id="corr"
            icon={Wrench}
            title="Corrección de ocupación"
            description="Ajusta el conteo cuando no coincida con los pasajeros a bordo."
          />

        </div>

        <div className="space-y-5 p-5 sm:p-6">

          {/* Comparación de valores */}

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">

            {/* Conteo actual */}

            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">

              <Users
                size={24}
                aria-hidden="true"
                className="mb-3 text-slate-500"
              />

              <p className="text-xs font-semibold text-slate-500">

                Conteo actual

              </p>

              <p className="mt-3 text-4xl font-extrabold tabular-nums text-slate-800">

                {bus.occupancy}

              </p>

              <p className="mt-2 text-[11px] text-slate-500">

                Pasajeros registrados

              </p>

            </div>

            {/* Nuevo conteo */}

            <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">

              <label
                htmlFor="cv"
                className="mb-3 text-xs font-bold text-blue-800"
              >

                Nuevo conteo

              </label>

              <div className="flex w-full items-center justify-center gap-2">

                <button
                  type="button"
                  aria-label="Disminuir nuevo conteo"
                  disabled={
                    busy ||
                    !validCount ||
                    numericValue <= 0
                  }
                  onClick={() =>
                    updateValue(
                      String(
                        numericValue - 1
                      )
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 enabled:hover:bg-blue-100 disabled:opacity-40"
                >

                  <Minus
                    size={21}
                    aria-hidden="true"
                  />

                </button>

                <input
                  id="cv"
                  type="text"
                  inputMode="numeric"
                  value={value}
                  required
                  disabled={busy}
                  aria-invalid={!validCount}
                  onChange={(event) =>
                    updateValue(
                      event.target.value
                    )
                  }
                  className="h-14 w-20 min-w-0 rounded-xl border border-blue-200 bg-white text-center text-3xl font-extrabold tabular-nums text-blue-950 outline-none focus:ring-4 focus:ring-blue-200"
                />

                <button
                  type="button"
                  aria-label="Aumentar nuevo conteo"
                  disabled={
                    busy ||
                    !validCount
                  }
                  onClick={() =>
                    updateValue(
                      String(
                        numericValue + 1
                      )
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 enabled:hover:bg-blue-100 disabled:opacity-40"
                >

                  <Plus
                    size={21}
                    aria-hidden="true"
                  />

                </button>

              </div>

              <p className="mt-3 text-[11px] text-blue-700">

                Pasajeros a corregir

              </p>

            </div>

          </div>

          {/* Resumen de diferencia */}

          {validCount && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">

              <span className="text-xs font-medium text-slate-500">

                Variación del conteo

              </span>

              <span
                className={`text-sm font-extrabold tabular-nums ${
                  difference > 0
                    ? "text-emerald-700"
                    : difference < 0
                      ? "text-amber-700"
                      : "text-slate-500"
                }`}
              >

                {difference > 0
                  ? "+"
                  : ""}

                {difference} pasajeros

              </span>

            </div>
          )}

          {!validCount && (
            <p
              role="alert"
              className="text-xs font-medium text-red-600"
            >

              Introduce un número entero
              mayor o igual a cero.

            </p>
          )}

          {/* Advertencia de capacidad */}

          {validCount &&
            numericValue > bus.max && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">

                <Info
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-amber-700"
                />

                <p className="text-xs leading-relaxed text-amber-800">

                  El nuevo conteo supera el aforo
                  configurado de {bus.max} pasajeros.
                  Verifica que corresponda a la
                  ocupación real de tu unidad.

                </p>

              </div>
            )}

          {/* Motivo obligatorio */}

          <div>

            <label
              htmlFor="cr"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >

              Motivo de la corrección

              <span className="ml-1 text-red-500">

                *

              </span>

            </label>

            <textarea
              id="cr"
              value={reason}
              required
              rows={4}
              disabled={busy}
              aria-describedby="reason-hint"
              onChange={(event) => {
                setReason(event.target.value);

                setConfirmation(null);

                setMsg(null);

                setOk(false);
              }}
              placeholder="Describe por qué necesitas corregir el número de pasajeros..."
              className={`${INPUT} resize-y`}
            />

            <div
              id="reason-hint"
              className="mt-2 flex items-center justify-between gap-2 text-[11px]"
            >

              <span className="text-slate-500">

                Mínimo 5 caracteres.

              </span>

              <span
                className={
                  validReason
                    ? "font-semibold text-emerald-700"
                    : "text-slate-400"
                }
              >

                {reason.trim().length} caracteres

              </span>

            </div>

          </div>

          {/* Información de auditoría */}

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">

            <ShieldCheck
              size={21}
              aria-hidden="true"
              className="shrink-0 text-blue-700"
            />

            <div>

              <p className="text-xs font-bold text-blue-900">

                Registro de auditoría

              </p>

              <p className="mt-1 text-xs leading-relaxed text-blue-800">

                El ajuste quedará registrado junto
                con el motivo de la corrección.

              </p>

            </div>

          </div>

          {/* Mensajes de respuesta */}

          {msg && (
            <ErrorState message={msg} />
          )}

          {ok && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
            >

              <CheckCircle2
                size={21}
                aria-hidden="true"
                className="shrink-0"
              />

              Conteo corregido correctamente.

            </div>
          )}

          {/* =================================
              CONFIRMACIÓN DE CORRECCIÓN
          ================================= */}

          {confirmation ? (
            <div className="animate-fade-in space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">

              <h3 className="text-sm font-bold text-blue-950">

                Confirma la corrección

              </h3>

              <div className="flex items-center justify-center gap-5 rounded-xl bg-white p-4">

                <div className="text-center">

                  <p className="text-xs text-slate-500">

                    Anterior

                  </p>

                  <p className="mt-1 text-3xl font-extrabold text-slate-800">

                    {confirmation.previous}

                  </p>

                </div>

                <ArrowRight
                  size={25}
                  aria-hidden="true"
                  className="shrink-0 text-blue-600"
                />

                <div className="text-center">

                  <p className="text-xs text-blue-700">

                    Nuevo

                  </p>

                  <p className="mt-1 text-3xl font-extrabold text-blue-900">

                    {confirmation.occupancy}

                  </p>

                </div>

              </div>

              <div>

                <p className="text-xs font-bold text-blue-900">

                  Motivo registrado

                </p>

                <p className="mt-1 break-words text-xs leading-relaxed text-blue-800">

                  {confirmation.reason}

                </p>

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setConfirmation(null)
                  }
                  className={OUTLINE}
                >

                  Cancelar

                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void submit()
                  }
                  className={PRIMARY}
                >

                  {busy ? (
                    <LoaderCircle
                      size={18}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                      aria-hidden="true"
                    />
                  )}

                  {busy
                    ? "Guardando..."
                    : "Confirmar ajuste"}

                </button>

              </div>

            </div>
          ) : (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">

              <button
                type="button"
                disabled={busy}
                onClick={reset}
                className={OUTLINE}
              >

                Restablecer

              </button>

              <button
                type="submit"
                disabled={
                  busy ||
                  !validCount ||
                  !validReason
                }
                className={`${PRIMARY} flex-1`}
              >

                <Save
                  size={19}
                  aria-hidden="true"
                />

                Registrar corrección

              </button>

            </div>
          )}

        </div>

      </form>

      {/* =================================
          BITÁCORA DE MOVIMIENTOS
      ================================= */}

      <section
        aria-labelledby="bit"
        className={`${CARD} overflow-hidden`}
      >

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">

          <SectionHeader
            id="bit"
            icon={History}
            title="Bitácora de movimientos"
            description="Registro de cambios en la ocupación."
          />

          <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold tabular-nums text-blue-700">

            {events.length} registros

          </span>

        </div>

        {/* =================================
            SIN MOVIMIENTOS
        ================================= */}

        {events.length === 0 ? (
          <div className="flex flex-col items-center p-8 text-center">

            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <History
                size={30}
                aria-hidden="true"
              />

            </span>

            <h3 className="text-sm font-bold text-slate-800">

              Sin movimientos registrados

            </h3>

            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">

              Aún no hay movimientos en esta
              jornada.

            </p>

          </div>
        ) : (
          <>

            {/* Encabezado de registros */}

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">

              <span>Movimiento</span>

              <span>Variación</span>

            </div>

            {/* Lista de movimientos */}

            <ul className="max-h-[580px] divide-y divide-slate-100 overflow-y-auto overscroll-contain">

              {events.map((event) => {
                const isCorrection =
                  /corr|ajust/i.test(
                    String(event.kind)
                  );

                const appearance =
                  eventStyle(
                    event.from,
                    event.to
                  );

                const Icon = isCorrection
                  ? Wrench
                  : appearance.icon;

                const style = isCorrection
                  ? "bg-blue-50 text-blue-700"
                  : appearance.style;

                return (
                  <li
                    key={event.id}
                    className="flex min-w-0 items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                  >

                    {/* Icono del evento */}

                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style}`}
                    >

                      <Icon
                        size={21}
                        aria-hidden="true"
                      />

                    </span>

                    {/* Información */}

                    <div className="min-w-0 flex-1">

                      <p className="break-words text-sm font-bold capitalize text-slate-800">

                        {event.kind}

                      </p>

                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium tabular-nums text-slate-600">

                        {event.from}

                        <ArrowRight
                          size={13}
                          aria-hidden="true"
                          className="text-slate-400"
                        />

                        {event.to} pasajeros

                      </p>

                      {event.reason && (
                        <p className="mt-2 break-words rounded-lg bg-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-600">

                          {event.reason}

                        </p>
                      )}

                      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">

                        <Clock
                          size={12}
                          aria-hidden="true"
                        />

                        {formatTime(event.at)}

                      </p>

                    </div>

                    {/* Diferencia */}

                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${style}`}
                    >

                      {appearance.amount}

                    </span>

                  </li>
                );
              })}

            </ul>

            {/* Pie de bitácora */}

            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-[11px] text-slate-500">

              <History
                size={15}
                aria-hidden="true"
                className="shrink-0 text-blue-600"
              />

              Movimientos más recientes primero.

            </div>

          </>
        )}

      </section>

    </div>
  );
}
