
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
  BadgeCheck,
  Bus,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  GraduationCap,
  LockKeyhole,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";

import AuthFrame, {
  ErrorNote,
} from "@/components/AuthFrame";

import {
  PasswordInput,
  SubmitButton,
  TextField,
} from "@/components/auth/fields";

import { useApp } from "@/lib/store";

/* =========================================
   BENEFICIOS DEL PASAJERO
========================================= */

const BENEFITS = [
  {
    icon: MapPin,
    title: "Encuentra tu micro",
    text: "Consulta rutas, líneas y micros cercanos.",
  },
  {
    icon: Wallet,
    title: "Gestiona tu Credicard",
    text: "Consulta tu saldo, recargas y movimientos.",
  },
  {
    icon: GraduationCap,
    title: "Tarifas estudiantiles",
    text: "Accede a los beneficios según tu acreditación.",
  },
  {
    icon: QrCode,
    title: "Carnet digital",
    text: "Presenta tu código QR desde tu celular.",
  },
];

/* =========================================
   PANEL INFORMATIVO
========================================= */

function PassengerBenefits() {
  return (
    <aside className="animate-fade-up delay-200 relative isolate flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-emerald-100 bg-linear-to-br from-white via-emerald-50/70 to-emerald-100/70 p-6 xl:p-7">

      {/* Decoración */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col">

        {/* Encabezado */}

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
          <GraduationCap
            size={29}
            aria-hidden="true"
          />
        </div>

        <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
          Movilidad personal
        </span>

        <h2 className="text-xl font-bold leading-tight tracking-tight text-emerald-950 xl:text-2xl">
          Todo lo que necesitas en una sola cuenta.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Disfruta las herramientas de RUTABOL-SCZ
          y mejora tu experiencia de viaje por la ciudad.
        </p>

        {/* Beneficios */}

        <div className="my-6 space-y-4 border-y border-emerald-200/60 py-6">

          {BENEFITS.map(
            ({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
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

        {/* Información inferior */}

        <div className="mt-auto rounded-xl border border-emerald-100 bg-white/80 p-4">

          <div className="flex items-start gap-3">

            <ShieldCheck
              size={22}
              aria-hidden="true"
              className="shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-xs font-bold text-emerald-900">
                Tu cuenta personal
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Utiliza tus propias credenciales para
                acceder a tu información y servicios.
              </p>
            </div>
          </div>
        </div>

        {/* Marca inferior */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-medium text-emerald-700">
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
   INICIO DE SESIÓN DEL PASAJERO
========================================= */

export default function LoginPasajero() {
  const { loginPassenger } = useApp();

  const router = useRouter();

  // Evita múltiples solicitudes simultáneas.
  const lock = useRef(false);

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

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

    const cleanId = identifier.trim();

    /* Validaciones */

    if (!cleanId) {
      setError(
        "Ingresa tu código RUDE, correo institucional o CI."
      );

      return;
    }

    if (!password) {
      setError(
        "Ingresa tu contraseña."
      );

      return;
    }

    /* Bloquear envíos duplicados */

    lock.current = true;

    setBusy(true);

    try {
      /*
       * Conservamos la función original
       * de autenticación del proyecto.
       */

      const err = await loginPassenger(
        cleanId,
        password
      );

      if (err) {
        setError(err);

        return;
      }

      /* Limpiar formulario */

      setIdentifier("");

      setPassword("");

      /* Ingresar al panel del pasajero */

      router.replace("/pasajero");

    } catch {
      setError(
        "No fue posible iniciar sesión. Verifica tu conexión e inténtalo nuevamente."
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
      icon={GraduationCap}
      title="¡Bienvenido de nuevo!"
      subtitle="Ingresa a tu cuenta de estudiante o pasajero para continuar."
      message="Tu pasaje, tu carnet y tus rutas en un solo lugar."
      desktopWide
    >
      <div className="mx-auto w-full max-w-[1050px]">

        {/* =================================
            DISTRIBUCIÓN DEL CONTENIDO
        ================================= */}

        <div className="grid min-w-0 items-stretch gap-5 min-[1200px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-6">

          {/* =================================
              TARJETA DEL FORMULARIO
          ================================= */}

          <section
            aria-labelledby="passenger-login"
            className="animate-fade-up relative min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:p-9"
          >

            {/* Barra superior */}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-emerald-900 via-emerald-600 to-emerald-400"
            />

            {/* Encabezado del formulario */}

            <div className="mb-7">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <ShieldCheck
                  size={14}
                  aria-hidden="true"
                />

                Acceso de pasajeros
              </div>

              <h2
                id="passenger-login"
                className="text-2xl font-bold tracking-tight text-slate-900"
              >
                Iniciar sesión
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Introduce tus credenciales para acceder
                a tu cuenta de RUTABOL-SCZ.
              </p>
            </div>

            {/* =================================
                FORMULARIO
            ================================= */}

            <form
              onSubmit={submit}
              className="flex flex-col gap-5"
              aria-busy={busy}
            >

              {/* IDENTIFICADOR */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                  <Mail
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Identificación del usuario
                  </span>
                </div>

                <TextField
                  label="Código RUDE, correo institucional o CI"
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  autoComplete="username"
                  disabled={busy}
                />

                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Usa cualquiera de los tres datos asociados a tu cuenta.
                </p>
              </div>

              {/* CONTRASEÑA */}

              <div className="min-w-0">

                <div className="mb-2 flex items-center gap-2 text-emerald-700">

                  <LockKeyhole
                    size={17}
                    aria-hidden="true"
                  />

                  <span className="text-xs font-semibold">
                    Seguridad de la cuenta
                  </span>
                </div>

                <PasswordInput
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (error) setError(null);
                  }}
                  required
                  autoComplete="current-password"
                  disabled={busy}
                />
              </div>

              {/* MENSAJE DE ERROR */}

              <ErrorNote text={error} />

              {/* BOTÓN DE INICIO DE SESIÓN */}

              <div className="mt-1">

                <SubmitButton busy={busy} />

              </div>

              {/* INFORMACIÓN DE ACCESO */}

              <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">

                <LockKeyhole
                  size={13}
                  aria-hidden="true"
                  className="shrink-0"
                />

                Accede utilizando tus credenciales personales.
              </div>
            </form>

            {/* =================================
                SEPARADOR
            ================================= */}

            <div className="my-6 flex items-center gap-3">

              <span className="h-px flex-1 bg-slate-200" />

              <span className="text-xs text-slate-400">
                ¿Eres nuevo?
              </span>

              <span className="h-px flex-1 bg-slate-200" />

            </div>

            {/* =================================
                REGISTRO DE NUEVOS USUARIOS
            ================================= */}

            <Link
              href="/registro"
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50"
            >
              <UserPlus
                size={18}
                aria-hidden="true"
              />

              Crear cuenta

              <ArrowRight
                size={17}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            {/* INFORMACIÓN DE REGISTRO */}

            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              Regístrate para acceder a los servicios
              digitales de transporte.
            </p>
          </section>

          {/* =================================
              PANEL DE BENEFICIOS
          ================================= */}

          <PassengerBenefits />

        </div>

        {/* =================================
            INFORMACIÓN ADICIONAL
        ================================= */}

        <div className="animate-fade-up delay-300 mt-5 grid gap-3 sm:grid-cols-3">

          {[
            {
              icon: BadgeCheck,
              text: "Tarifas verificadas",
            },
            {
              icon: CreditCard,
              text: "Pagos digitales",
            },
            {
              icon: CheckCircle2,
              text: "Acreditación estudiantil",
            },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-600"
            >
              <Icon
                size={17}
                aria-hidden="true"
                className="shrink-0 text-emerald-600"
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
            ¿Tienes problemas para ingresar?
          </span>

          <Link
            href="/#ayuda"
            className="font-semibold text-emerald-700 transition-colors hover:text-emerald-950 hover:underline"
          >
            Centro de ayuda
          </Link>

        </div>
      </div>
    </AuthFrame>
  );
}
