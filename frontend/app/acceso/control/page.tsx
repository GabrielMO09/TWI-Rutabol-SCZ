
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  ArrowRight,
  Bus,
  ChartNoAxesColumn,
  CircleHelp,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  UserRound,
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
   FUNCIONALIDADES DEL CENTRO DE CONTROL
========================================= */

const CONTROL_FEATURES = [
  {
    icon: Bus,
    title: "Gestión de flota",
    text: "Administra las unidades y conductores del transporte urbano.",
  },
  {
    icon: Users,
    title: "Administración de usuarios",
    text: "Gestiona pasajeros, acreditaciones y estados de usuarios.",
  },
  {
    icon: MapPin,
    title: "Supervisión de rutas",
    text: "Consulta las líneas y unidades del sistema de transporte.",
  },
  {
    icon: TriangleAlert,
    title: "Control de incidencias",
    text: "Supervisa los reportes y situaciones del servicio.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Reportes operativos",
    text: "Consulta información sobre las operaciones del sistema.",
  },
];

/* =========================================
   PANEL INFORMATIVO ADMINISTRATIVO
========================================= */

function ControlBenefits() {
  return (
    <aside className="animate-fade-up delay-200 relative isolate flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-linear-to-br from-white via-violet-50 to-violet-100/70 p-5 sm:p-7">

      {/* Decoración de fondo */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col">

        {/* Icono principal */}

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-sm">

          <Activity
            size={28}
            aria-hidden="true"
          />

        </div>

        <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-700">
          Administración del transporte
        </span>

        <h2 className="text-xl font-bold leading-tight tracking-tight text-violet-950 xl:text-2xl">
          Control integral del sistema.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Supervisa y administra las operaciones del
          transporte urbano desde una plataforma centralizada.
        </p>

        {/* Funcionalidades disponibles */}

        <div className="my-6 space-y-4 border-y border-violet-200/60 py-5">

          {CONTROL_FEATURES.map(
            ({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-violet-700 shadow-sm">

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

        <div className="mt-auto rounded-xl border border-violet-100 bg-white/80 p-4">

          <div className="flex items-start gap-3">

            <ShieldCheck
              size={24}
              aria-hidden="true"
              className="shrink-0 text-violet-700"
            />

            <div>

              <p className="text-xs font-bold text-violet-900">
                Acceso administrativo restringido
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Las herramientas del Centro de Control
                están destinadas al personal autorizado
                de RUTABOL-SCZ.
              </p>

            </div>

          </div>

        </div>

        {/* Marca institucional */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-violet-700">

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
   INICIO DE SESIÓN DEL CENTRO DE CONTROL
========================================= */

export default function LoginControl() {
  const { loginControl } = useApp();

  const router = useRouter();

  // Evita múltiples solicitudes simultáneas.
  const lock = useRef(false);

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [id, setId] = useState("");

  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =====================================
     PROCESAR INICIO DE SESIÓN
  ===================================== */

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (lock.current) return;

    setError(null);

    const cleanId = id.trim();

    /* Validar identificador */

    if (!cleanId) {
      setError(
        "Ingresa tu identificador de administrador."
      );

      return;
    }

    /* Validar contraseña */

    if (!password) {
      setError(
        "Ingresa tu contraseña."
      );

      return;
    }

    /* Bloquear solicitudes duplicadas */

    lock.current = true;

    setBusy(true);

    try {
      /*
       * Se conserva la función original
       * de autenticación del Centro de Control.
       */

      const failure = await loginControl(
        cleanId,
        password
      );

      if (failure) {
        setError(failure);

        return;
      }

      /*
       * Limpiar los campos para que el próximo
       * inicio de sesión comience en blanco.
       */

      setId("");

      setPassword("");

      /* Redirigir al panel administrativo */

      router.replace("/control");

    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No fue posible iniciar sesión. Inténtalo nuevamente."
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
      title="Centro de Control"
      subtitle="Accede a las herramientas de administración y supervisión del transporte urbano."
      message="Visibilidad completa del servicio, en tiempo real."
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
            aria-labelledby="control-login"
            className="animate-fade-up relative min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:p-9"
          >

            {/* Barra superior */}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-violet-900 via-violet-600 to-violet-400"
            />

            {/* Encabezado del formulario */}

            <div className="mb-7">

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">

                <LayoutDashboard
                  size={29}
                  aria-hidden="true"
                />

              </div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">

                <ShieldCheck
                  size={14}
                  aria-hidden="true"
                />

                Acceso administrativo

              </div>

              <h2
                id="control-login"
                className="text-2xl font-bold tracking-tight text-slate-900"
              >
                Iniciar sesión
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Introduce tus credenciales para acceder
                al panel del Centro de Control.
              </p>

            </div>

            {/* =================================
                FORMULARIO DE AUTENTICACIÓN
            ================================= */}

            <form
              onSubmit={submit}
              className="flex flex-col gap-5"
              aria-busy={busy}
            >

              {/* IDENTIFICADOR */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-violet-700">

                  <UserRound
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Identificación del administrador
                  </span>

                </div>

                <TextField
                  id="control-id"
                  label="Identificador"
                  autoComplete="username"
                  value={id}
                  onChange={(event) => {
                    setId(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  disabled={busy}
                />

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Utiliza el identificador asignado
                  a tu cuenta administrativa.
                </p>

              </div>

              {/* CONTRASEÑA */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-violet-700">

                  <LockKeyhole
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Seguridad de acceso
                  </span>

                </div>

                <PasswordInput
                  id="control-password"
                  label="Contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  disabled={busy}
                />

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Ingresa tu contraseña de acceso
                  al sistema administrativo.
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
                disabled={busy}
                className="group mt-1 flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-violet-700 to-violet-800 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:from-violet-800 enabled:hover:to-violet-950 enabled:hover:shadow-lg enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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
                    Ingresar

                    <ArrowRight
                      size={19}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

              {/* INFORMACIÓN DE SEGURIDAD */}

              <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">

                <LockKeyhole
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-violet-600"
                />

                Acceso exclusivo para personal autorizado.

              </div>

            </form>

            {/* =================================
                AVISO ADMINISTRATIVO
            ================================= */}

            <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/70 p-4">

              <div className="flex items-start gap-3">

                <ShieldCheck
                  size={22}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-violet-700"
                />

                <div>

                  <p className="text-sm font-bold text-violet-900">
                    Uso de credenciales personales
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    No compartas tu identificador ni tu
                    contraseña con otras personas.
                    Utiliza únicamente la cuenta que te
                    asignó la administración.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================
                SOPORTE DE ACCESO
            ================================= */}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-start gap-3">

                <CircleHelp
                  size={21}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-violet-700"
                />

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    ¿Problemas para ingresar?
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Comunícate con el responsable del
                    sistema para verificar o recuperar
                    tus credenciales administrativas.
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =================================
              PANEL DE FUNCIONALIDADES
          ================================= */}

          <ControlBenefits />

        </div>

        {/* =================================
            FUNCIONES DESTACADAS
        ================================= */}

        <div className="animate-fade-up delay-300 mt-5 grid gap-3 sm:grid-cols-3">

          {[
            {
              icon: Eye,
              text: "Supervisión del servicio",
            },
            {
              icon: Bus,
              text: "Administración de flota",
            },
            {
              icon: ChartNoAxesColumn,
              text: "Reportes del sistema",
            },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-600 shadow-sm"
            >

              <Icon
                size={18}
                aria-hidden="true"
                className="shrink-0 text-violet-600"
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
            className="font-semibold text-violet-700 transition-colors hover:text-violet-950 hover:underline"
          >
            Consultar centro de ayuda
          </Link>

        </div>

      </div>

    </AuthFrame>
  );
}
