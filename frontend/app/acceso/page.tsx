
import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  Bus,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import AuthFrame from "@/components/AuthFrame";

/* =========================================
   CONFIGURACIÓN DE LOS PERFILES
========================================= */

const ROLES = [
  {
    href: "/acceso/pasajero",

    icon: GraduationCap,

    title: "Estudiante o pasajero",

    category: "Movilidad personal",

    text: "Encuentra tu micro, consulta las tarifas y paga tus pasajes de forma digital.",

    features: [
      "Consulta de rutas y micros",
      "Tarifas estudiantiles",
      "Credicard y pagos digitales",
      "Carnet digital",
    ],

    iconStyle:
      "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white",

    categoryStyle: "text-emerald-700",

    checkStyle: "text-emerald-600",

    accentStyle:
      "bg-linear-to-r from-emerald-800 to-emerald-400",

    hoverStyle:
      "hover:border-emerald-300 hover:shadow-emerald-900/10",

    buttonStyle:
      "bg-emerald-700 group-hover:bg-emerald-900",

    glowStyle: "bg-emerald-100/60",

    delay: "delay-100",
  },

  {
    href: "/acceso/chofer",

    icon: Bus,

    title: "Conductor",

    category: "Gestión operativa",

    text: "Administra tu unidad de transporte y controla las operaciones de tu jornada.",

    features: [
      "Control de aforo",
      "Validación de pasajeros",
      "Gestión de trasbordos",
      "Control de jornada",
    ],

    iconStyle:
      "bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white",

    categoryStyle: "text-blue-700",

    checkStyle: "text-blue-600",

    accentStyle:
      "bg-linear-to-r from-blue-800 to-blue-400",

    hoverStyle:
      "hover:border-blue-300 hover:shadow-blue-900/10",

    buttonStyle:
      "bg-blue-700 group-hover:bg-blue-900",

    glowStyle: "bg-blue-100/60",

    delay: "delay-200",
  },

  {
    href: "/acceso/control",

    icon: LayoutDashboard,

    title: "Centro de Control",

    category: "Administración",

    text: "Supervisa el transporte urbano y administra las operaciones del sistema.",

    features: [
      "Supervisión del sistema",
      "Administración de usuarios",
      "Gestión de líneas y flota",
      "Control de incidencias",
    ],

    iconStyle:
      "bg-violet-50 text-violet-700 group-hover:bg-violet-700 group-hover:text-white",

    categoryStyle: "text-violet-700",

    checkStyle: "text-violet-600",

    accentStyle:
      "bg-linear-to-r from-violet-800 to-violet-400",

    hoverStyle:
      "hover:border-violet-300 hover:shadow-violet-900/10",

    buttonStyle:
      "bg-violet-700 group-hover:bg-violet-900",

    glowStyle: "bg-violet-100/60",

    delay: "delay-300",
  },
];

/* =========================================
   TIPO DE PERFIL
========================================= */

type Role = (typeof ROLES)[number];

/* =========================================
   TARJETA DE SELECCIÓN DE PERFIL
========================================= */

function RoleCard({
  href,
  icon: Icon,
  title,
  category,
  text,
  features,
  iconStyle,
  categoryStyle,
  checkStyle,
  accentStyle,
  hoverStyle,
  buttonStyle,
  glowStyle,
  delay,
}: Role) {
  return (
    <Link
      href={href}
      className={`animate-fade-up ${delay} group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.99] ${hoverStyle}`}
    >
      {/* BARRA SUPERIOR DE COLOR */}

      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1.5 ${accentStyle}`}
      />

      {/* DECORACIÓN DE FONDO */}

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${glowStyle}`}
      />

      {/* CONTENIDO DE LA TARJETA */}

      <div className="relative flex h-full flex-col p-5 sm:p-6">

        {/* ICONO DEL PERFIL */}

        <div className="mb-5 flex items-start justify-between gap-3">
          <span
            className={`flex h-15 w-15 shrink-0 items-center justify-center rounded-[18px] transition-all duration-300 group-hover:scale-105 ${iconStyle}`}
          >
            <Icon size={29} aria-hidden="true" />
          </span>

          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-transparent group-hover:bg-slate-100 group-hover:text-slate-700">
            <ArrowUpRight
              size={17}
              aria-hidden="true"
            />
          </span>
        </div>

        {/* CATEGORÍA */}

        <p
          className={`mb-2 text-[10px] font-bold uppercase tracking-[0.15em] ${categoryStyle}`}
        >
          {category}
        </p>

        {/* TÍTULO */}

        <h2 className="mb-3 text-xl font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>

        {/* DESCRIPCIÓN */}

        <p className="min-h-16 text-sm leading-relaxed text-slate-500">
          {text}
        </p>

        {/* DIVISIÓN */}

        <div className="my-5 h-px w-full bg-slate-100" />

        {/* FUNCIONALIDADES */}

        <div className="flex-1">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Funcionalidades
          </p>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5"
              >
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  className={`mt-0.5 shrink-0 ${checkStyle}`}
                />

                <span className="text-[13px] font-medium leading-relaxed text-slate-600">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* BOTÓN VISUAL DE INGRESO */}

        <div
          className={`mt-7 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 ${buttonStyle}`}
        >
          <span>Ingresar</span>

          <ArrowRight
            size={18}
            aria-hidden="true"
            className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}

/* =========================================
   PÁGINA DE SELECCIÓN DE PERFILES
========================================= */

export default function Acceso() {
  return (
    <AuthFrame
      title="¿Cómo deseas ingresar?"
      subtitle="Selecciona tu perfil para continuar al sistema."
      back="/"
      desktopWide
    >
      <div className="mx-auto w-full max-w-[1200px]">

        {/* =================================
            ENCABEZADO INFORMATIVO
        ================================= */}

        <div className="animate-fade-up mb-7 text-center">

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck
              size={15}
              aria-hidden="true"
            />

            Acceso al sistema
          </div>

          <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-500">
            RUTABOL-SCZ cuenta con diferentes perfiles
            de acceso, diseñados para las necesidades
            de cada usuario del transporte urbano.
          </p>
        </div>

        {/* =================================
            TARJETAS DE PERFILES
        ================================= */}

        <div
          className="grid grid-cols-1 gap-4 sm:gap-5 min-[1350px]:grid-cols-3"
          aria-label="Perfiles disponibles"
        >
          {ROLES.map((role) => (
            <RoleCard
              key={role.href}
              {...role}
            />
          ))}
        </div>

        {/* =================================
            REGISTRO DE NUEVOS USUARIOS
        ================================= */}

        <div className="animate-fade-up delay-300 mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserPlus
                  size={22}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ¿Todavía no tienes una cuenta?
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  Regístrate como pasajero y comienza
                  a utilizar RUTABOL-SCZ.
                </p>
              </div>
            </div>

            <Link
              href="/registro"
              className="btn btn-primary shrink-0 gap-2 sm:w-auto"
            >
              Crear una cuenta

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        {/* =================================
            INFORMACIÓN DE ACCESO
        ================================= */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex items-start gap-3">

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
              <LockKeyhole
                size={17}
                aria-hidden="true"
              />
            </span>

            <div>
              <p className="text-xs font-semibold text-slate-700">
                Acceso según tu perfil
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Los conductores y el personal del Centro
                de Control deben ingresar utilizando
                las credenciales proporcionadas por
                la administración.
              </p>
            </div>
          </div>
        </div>

        {/* =================================
            CENTRO DE AYUDA
        ================================= */}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">

          <CircleHelp
            size={16}
            aria-hidden="true"
          />

          <span>¿Necesitas ayuda para ingresar?</span>

          <Link
            href="/#ayuda"
            className="font-semibold text-emerald-700 transition-colors hover:text-emerald-900 hover:underline"
          >
            Consultar centro de ayuda
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}
