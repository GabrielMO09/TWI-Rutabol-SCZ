
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  ArrowRight,
  Bus,
  ChevronDown,
  CircleHelp,
  Clock3,
  Gauge,
  Hash,
  LayoutDashboard,
  LockKeyhole,
  QrCode,
  Repeat,
  Route,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

import AuthFrame, {
  ErrorNote,
} from "@/components/AuthFrame";

import {
  PasswordInput,
  TextField,
} from "@/components/auth/fields";

import { useApp } from "@/lib/store";

/* =========================================
   FUNCIONALIDADES DEL CONDUCTOR
========================================= */

const DRIVER_FEATURES = [
  {
    icon: Gauge,
    title: "Control de aforo",
    text: "Supervisa la ocupación de tu unidad en tiempo real.",
  },
  {
    icon: QrCode,
    title: "Validación de pasajeros",
    text: "Verifica los códigos QR y las credenciales digitales.",
  },
  {
    icon: Clock3,
    title: "Gestión de jornada",
    text: "Inicia y finaliza tus actividades de transporte.",
  },
  {
    icon: Repeat,
    title: "Gestión de trasbordos",
    text: "Gestiona el traslado de pasajeros cuando corresponda.",
  },
  {
    icon: TriangleAlert,
    title: "Reporte de incidencias",
    text: "Comunica problemas durante tu recorrido.",
  },
];

/* =========================================
   PANEL INFORMATIVO DEL CONDUCTOR
========================================= */

function DriverBenefits() {
  return (
    <aside className="animate-fade-up delay-200 relative isolate flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-blue-100 bg-linear-to-br from-white via-blue-50 to-blue-100/70 p-5 sm:p-7">

      {/* Decoración de fondo */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col">

        {/* Icono principal */}

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm">
          <LayoutDashboard
            size={28}
            aria-hidden="true"
          />
        </div>

        <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">
          Gestión operativa
        </span>

        <h2 className="text-xl font-bold leading-tight tracking-tight text-blue-950 xl:text-2xl">
          Tu unidad de transporte, bajo control.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Accede a las herramientas necesarias para
          gestionar tu jornada y ofrecer un mejor
          servicio a los pasajeros.
        </p>

        {/* Lista de funcionalidades */}

        <div className="my-6 space-y-4 border-y border-blue-200/60 py-5">

          {DRIVER_FEATURES.map(
            ({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm">
                  <Icon
                    size={20}
                    aria-hidden="true"
                  />
                </span>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">
                    {title}
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {text}
                  </p>
                </div>
              </div>
            )
          )}

        </div>

        {/* Información de seguridad */}

        <div className="mt-auto rounded-xl border border-blue-100 bg-white/80 p-4">

          <div className="flex items-start gap-3">

            <ShieldCheck
              size={23}
              aria-hidden="true"
              className="shrink-0 text-blue-700"
            />

            <div>
              <p className="text-xs font-bold text-blue-900">
                Personal autorizado
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Este acceso está destinado a conductores
                registrados y autorizados por la
                administración del sistema.
              </p>
            </div>

          </div>

        </div>

        {/* Marca inferior */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-blue-700">

          <Bus
            size={16}
            aria-hidden="true"
          />

          RUTABOL-SCZ

        </div>

      </div>

    </aside>
  );
}

/* =========================================
   INICIO DE SESIÓN DEL CONDUCTOR
========================================= */

export default function LoginChofer() {
  const { loginDriver, lines } = useApp();

  const router = useRouter();

  // Evita solicitudes duplicadas.
  const lock = useRef(false);

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [chosen, setChosen] = useState("");

  const line =
    lines.find((item) => item.id === chosen)?.id ||
    lines[0]?.id ||
    "";

  const [internal, setInternal] = useState("");

  const [pin, setPin] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  /* =====================================
     PROCESAR INICIO DE SESIÓN
  ===================================== */

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (lock.current) return;

    setError(null);

    const cleanInternal = internal.trim();

    /* Validar línea seleccionada */

    if (!line || !lines.some((item) => item.id === line)) {
      setError(
        "Selecciona una línea de micro disponible."
      );

      return;
    }

    /* Validar número interno */

    if (!cleanInternal) {
      setError(
        "Ingresa el número interno de tu unidad."
      );

      return;
    }

    /* Validar PIN */

    if (!pin) {
      setError(
        "Ingresa tu PIN de seguridad."
      );

      return;
    }

    /* Bloquear envíos simultáneos */

    lock.current = true;

    setBusy(true);

    try {
      /*
       * Se conserva la función original
       * de autenticación del conductor.
       */

      const err = await loginDriver(
        line,
        cleanInternal,
        pin
      );

      if (err) {
        setError(err);

        return;
      }

      /* Limpiar formulario */

      setInternal("");

      setPin("");

      /* Acceder al panel del conductor */

      router.replace("/chofer");

    } catch {
      setError(
        "No fue posible iniciar sesión. Verifica tu conexión con el sistema e inténtalo nuevamente."
      );

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <AuthFrame
      title="Bienvenido, conductor"
      subtitle="Accede a tu cuenta para gestionar tu unidad y jornada de transporte."
      message="Cada viaje, bajo control y con el aforo al día."
      desktopWide
    >

      <div className="mx-auto w-full max-w-[1050px]">

        {/* =================================
            DISTRIBUCIÓN PRINCIPAL
        ================================= */}

        <div className="grid min-w-0 items-stretch gap-5 min-[1200px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-6">

          {/* =================================
              TARJETA DEL FORMULARIO
          ================================= */}

          <section
            aria-labelledby="driver-login"
            className="animate-fade-up relative min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:p-9"
          >

            {/* Barra superior */}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-blue-900 via-blue-600 to-blue-400"
            />

            {/* Encabezado del formulario */}

            <div className="mb-7">

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">

                <Bus
                  size={29}
                  aria-hidden="true"
                />

              </div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">

                <ShieldCheck
                  size={14}
                  aria-hidden="true"
                />

                Acceso operativo

              </div>

              <h2
                id="driver-login"
                className="text-2xl font-bold tracking-tight text-slate-900"
              >
                Iniciar sesión
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Introduce las credenciales asignadas por
                la administración de RUTABOL-SCZ.
              </p>

            </div>

            {/* =================================
                FORMULARIO DEL CONDUCTOR
            ================================= */}

            <form
              onSubmit={submit}
              className="flex flex-col gap-5"
              aria-busy={busy}
            >

              {/* =================================
                  SELECCIÓN DE LÍNEA
              ================================= */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-blue-700">

                  <Route
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Identificación de la unidad
                  </span>

                </div>

                <label
                  htmlFor="line"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Línea de micro
                </label>

                <div className="relative">

                  <select
                    id="line"
                    name="line"
                    value={line}
                    onChange={(event) => {
                      setChosen(event.target.value);

                      if (error) setError(null);
                    }}
                    required
                    disabled={busy || lines.length === 0}
                    className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-800 outline-none transition-all hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >

                    {lines.length === 0 && (
                      <option value="">
                        No hay líneas disponibles
                      </option>
                    )}

                    {lines.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}

                  </select>

                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                </div>

                {lines.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Selecciona la línea a la que
                    pertenece tu unidad.
                  </p>
                ) : (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"
                  >

                    <TriangleAlert
                      size={16}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                    />

                    Las líneas todavía no están disponibles.
                    Si el problema continúa, verifica la
                    conexión con el backend.

                  </div>
                )}

              </div>

              {/* =================================
                  NÚMERO INTERNO
              ================================= */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-blue-700">

                  <Hash
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Número de identificación
                  </span>

                </div>

                <TextField
                  id="int"
                  label="Número interno"
                  inputMode="numeric"
                  value={internal}
                  onChange={(event) => {
                    setInternal(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  disabled={busy}
                />

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Ingresa el número interno asignado
                  a tu micro.
                </p>

              </div>

              {/* =================================
                  PIN DE SEGURIDAD
              ================================= */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-blue-700">

                  <LockKeyhole
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Seguridad de acceso
                  </span>

                </div>

                <PasswordInput
                  id="pin"
                  label="PIN de seguridad"
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  disabled={busy}
                />

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Utiliza el PIN que te proporcionó
                  la administración.
                </p>

              </div>

              {/* =================================
                  MENSAJE DE ERROR
              ================================= */}

              <ErrorNote text={error} />

              {/* =================================
                  BOTÓN DE ACCESO
              ================================= */}

              <button
                type="submit"
                disabled={busy || lines.length === 0}
                className="group mt-1 flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-blue-700 to-blue-800 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:from-blue-800 enabled:hover:to-blue-950 enabled:hover:shadow-lg enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {busy ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    />

                    Verificando credenciales...
                  </>
                ) : (
                  <>
                    Ingresar al panel

                    <ArrowRight
                      size={19}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

              {/* Información inferior */}

              <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">

                <ShieldCheck
                  size={15}
                  aria-hidden="true"
                  className="shrink-0 text-blue-600"
                />

                Acceso exclusivo para conductores autorizados.

              </div>

            </form>

            {/* =================================
                SOPORTE DE ACCESO
            ================================= */}

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-start gap-3">

                <CircleHelp
                  size={21}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-blue-700"
                />

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    ¿Problemas con tus credenciales?
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Comunícate con el Centro de Control
                    o con la administración para verificar
                    tu línea, número interno o PIN.
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =================================
              PANEL DE FUNCIONALIDADES
          ================================= */}

          <DriverBenefits />

        </div>

        {/* =================================
            FUNCIONES DESTACADAS
        ================================= */}

        <div className="animate-fade-up delay-300 mt-5 grid gap-3 sm:grid-cols-3">

          {[
            {
              icon: Users,
              text: "Gestión de pasajeros",
            },
            {
              icon: Gauge,
              text: "Control de ocupación",
            },
            {
              icon: Clock3,
              text: "Gestión de jornada",
            },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-600 shadow-sm"
            >

              <Icon
                size={18}
                aria-hidden="true"
                className="shrink-0 text-blue-600"
              />

              {text}

            </div>
          ))}

        </div>

        {/* =================================
            CENTRO DE AYUDA
        ================================= */}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">

          <CircleHelp
            size={16}
            aria-hidden="true"
          />

          <span>
            ¿Necesitas información adicional?
          </span>

          <Link
            href="/#ayuda"
            className="font-semibold text-blue-700 transition-colors hover:text-blue-950 hover:underline"
          >
            Consultar centro de ayuda
          </Link>

        </div>

      </div>

    </AuthFrame>
  );
}
