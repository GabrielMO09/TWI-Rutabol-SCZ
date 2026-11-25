
import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bus,
  CircleAlert,
  CreditCard,
  House,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import "@/app/area.css";

/* =========================================
   TIPOGRAFÍA
========================================= */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/* =========================================
   PROPIEDADES DEL COMPONENTE
========================================= */

interface AuthFrameProps {
  title: string;
  subtitle?: string;
  back?: string;
  backLabel?: string;
  icon?: LucideIcon;
  message?: string;

  // Formulario amplio de registro.
  wide?: boolean;

  // Distribución amplia para computadoras.
  desktopWide?: boolean;

  // Mostrar acceso directo al inicio.
  home?: boolean;

  children: ReactNode;
}

/* =========================================
   LOGOTIPO PRINCIPAL
========================================= */

function Brand({
  light = false,
}: {
  light?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-3 whitespace-nowrap ${
        light
          ? "text-white"
          : "text-emerald-950"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          light
            ? "border border-white/15 bg-white/10 text-emerald-200"
            : "bg-emerald-700 text-white shadow-md"
        }`}
      >
        <Bus size={23} aria-hidden="true" />
      </span>

      <span className="max-[359px]:sr-only">
        <span className="block text-base font-extrabold tracking-tight">
          RUTABOL-SCZ
        </span>

        <span
          className={`block text-[10px] font-medium tracking-wide ${
            light
              ? "text-emerald-200/75"
              : "text-slate-500"
          }`}
        >
          Movilidad urbana inteligente
        </span>
      </span>
    </span>
  );
}

/* =========================================
   ILUSTRACIÓN DE RUTAS
========================================= */

function RoutesArt() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[330px]"
    >
      <div className="absolute inset-10 rounded-full bg-emerald-400/15 blur-3xl" />

      <svg
        viewBox="0 0 400 300"
        fill="none"
        className="relative h-auto w-full"
      >
        {/* Fondo circular */}

        <circle
          cx="200"
          cy="150"
          r="125"
          fill="#10B981"
          fillOpacity=".07"
        />

        <circle
          cx="200"
          cy="150"
          r="145"
          stroke="#FFFFFF"
          strokeOpacity=".08"
          strokeDasharray="4 10"
        />

        {/* Cuadrícula decorativa */}

        {[60, 120, 180, 240, 300, 360].map((x) => (
          <path
            key={`x-${x}`}
            d={`M${x} 20V280`}
            stroke="#FFFFFF"
            strokeOpacity=".045"
          />
        ))}

        {[60, 120, 180, 240].map((y) => (
          <path
            key={`y-${y}`}
            d={`M20 ${y}H380`}
            stroke="#FFFFFF"
            strokeOpacity=".045"
          />
        ))}

        {/* Ruta principal */}

        <path
          d="M25 240C95 240 100 145 170 145S255 210 320 165 375 75 375 35"
          stroke="#34D399"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Rutas secundarias */}

        <path
          d="M25 70C80 70 115 110 170 90S260 40 335 75"
          stroke="#D1FAE5"
          strokeOpacity=".35"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />

        <path
          d="M65 280C125 235 200 265 270 230"
          stroke="#D1FAE5"
          strokeOpacity=".25"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />

        {/* Estaciones */}

        {[
          [25, 240],
          [170, 145],
          [320, 165],
          [375, 35],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle
              cx={x}
              cy={y}
              r="19"
              fill="#10B981"
              fillOpacity=".12"
            />

            <circle
              cx={x}
              cy={y}
              r="12"
              fill="#064E3B"
              stroke="#34D399"
              strokeWidth="4"
            />

            <circle
              cx={x}
              cy={y}
              r="4"
              fill="#FFFFFF"
            />
          </g>
        ))}

        {/* Micro decorativo */}

        <g transform="translate(95 35)">
          <rect
            width="145"
            height="75"
            rx="15"
            fill="#ECFDF5"
          />

          <rect
            x="10"
            y="12"
            width="32"
            height="25"
            rx="5"
            fill="#064E3B"
          />

          <rect
            x="49"
            y="12"
            width="32"
            height="25"
            rx="5"
            fill="#064E3B"
          />

          <rect
            x="88"
            y="12"
            width="45"
            height="50"
            rx="5"
            fill="#064E3B"
          />

          <rect
            y="45"
            width="145"
            height="7"
            fill="#10B981"
          />

          <circle
            cx="30"
            cy="75"
            r="12"
            fill="#0F172A"
            stroke="#ECFDF5"
            strokeWidth="4"
          />

          <circle
            cx="115"
            cy="75"
            r="12"
            fill="#0F172A"
            stroke="#ECFDF5"
            strokeWidth="4"
          />
        </g>
      </svg>
    </div>
  );
}

/* =========================================
   BENEFICIOS DE LA PLATAFORMA
========================================= */

const BENEFITS = [
  {
    icon: MapPin,
    title: "Rutas y micros",
    text: "Consulta el transporte urbano.",
  },
  {
    icon: CreditCard,
    title: "Pagos digitales",
    text: "Gestiona tu saldo y tus pasajes.",
  },
  {
    icon: BadgeCheck,
    title: "Tarifas verificadas",
    text: "Accede a la tarifa correspondiente.",
  },
];

/* =========================================
   ESTRUCTURA PRINCIPAL
========================================= */

export default function AuthFrame({
  title,
  subtitle,
  back = "/acceso",
  backLabel,
  icon: Icon,
  message = "Movilidad urbana más simple, segura y conectada.",
  wide = false,
  desktopWide = false,
  home = false,
  children,
}: AuthFrameProps) {
  const label =
    backLabel ??
    (back === "/"
      ? "Volver al inicio"
      : "Cambiar perfil");

  const expanded = wide || desktopWide;

  /* =====================================
     DISTRIBUCIÓN PARA COMPUTADORAS
  ===================================== */

  const layout = desktopWide
    ? "lg:grid-cols-[minmax(250px,27fr)_minmax(0,73fr)]"
    : wide
      ? "lg:grid-cols-[minmax(260px,30fr)_minmax(0,70fr)]"
      : "lg:grid-cols-[minmax(280px,35fr)_minmax(0,65fr)]";

  /* =====================================
     ANCHO DEL CONTENIDO
  ===================================== */

  const contentWidth = desktopWide
    ? "max-w-[1200px]"
    : wide
      ? "max-w-[960px]"
      : "max-w-[520px]";

  return (
    <div
      data-area="auth"
      className={`${inter.variable} flex min-h-dvh flex-col bg-slate-50 lg:grid ${layout}`}
    >
      {/* =================================
          PANEL LATERAL DE ESCRITORIO
      ================================= */}

      <aside className="relative isolate hidden min-w-0 flex-col overflow-hidden bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh">

        {/* Decoraciones */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Contenido lateral */}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-7 xl:px-9 xl:py-9">

          {/* Marca */}

          <Link
            href="/"
            aria-label="RUTABOL-SCZ, ir al inicio"
            className="shrink-0 self-start rounded-xl transition-opacity hover:opacity-80"
          >
            <Brand light />
          </Link>

          {/* Información central */}

          <div className="flex flex-1 flex-col justify-center py-8">

            <div className="animate-fade-in">
              <RoutesArt />
            </div>

            <div className="animate-fade-up">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Movilidad inteligente
              </div>

              <p className="text-2xl font-bold leading-tight tracking-tight text-white xl:text-3xl">
                {message}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-emerald-100/75">
                Transporte público de Santa Cruz de la Sierra,
                Bolivia.
              </p>
            </div>

            {/* Beneficios */}

            <div className="mt-6 space-y-4 border-t border-white/15 pt-6">

              {BENEFITS.map(
                ({ icon: BenefitIcon, title, text }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-emerald-300">
                      <BenefitIcon
                        size={19}
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {title}
                      </p>

                      <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-100/60">
                        {text}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Pie de página lateral */}

          <div className="shrink-0 border-t border-white/10 pt-5">

            <p className="flex items-center gap-2 text-xs font-medium text-emerald-100/80">
              <ShieldCheck
                size={15}
                aria-hidden="true"
              />

              Plataforma de transporte urbano
            </p>

            <p className="mt-3 text-[11px] text-emerald-100/55">
              © RUTABOL-SCZ
            </p>
          </div>
        </div>
      </aside>

      {/* =================================
          PANEL PRINCIPAL
      ================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col bg-slate-50">

        {/* Fondo decorativo */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl"
        />

        {/* =================================
            ENCABEZADO
        ================================= */}

        <header className="relative flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:justify-end lg:px-8">

          {/* Marca para celulares */}

          <Link
            href="/"
            aria-label="Ir al inicio"
            className="shrink-0 rounded-xl lg:hidden"
          >
            <Brand />
          </Link>

          <div className="flex items-center gap-2">

            {home && back !== "/" && (
              <Link
                href="/"
                aria-label="Volver al inicio"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <House
                  size={17}
                  aria-hidden="true"
                />

                <span className="hidden sm:inline">
                  Inicio
                </span>
              </Link>
            )}

            <Link
              href={back}
              aria-label={label}
              className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-transparent px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-200 hover:bg-white hover:text-emerald-800 sm:text-sm"
            >
              <ArrowLeft
                size={17}
                aria-hidden="true"
                className="shrink-0 transition-transform group-hover:-translate-x-1"
              />

              <span className="max-sm:sr-only">
                {label}
              </span>
            </Link>
          </div>
        </header>

        {/* =================================
            CONTENIDO PRINCIPAL
        ================================= */}

        <main
          className={`relative mx-auto flex w-full min-w-0 flex-1 flex-col ${contentWidth} ${
            expanded
              ? "justify-start px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8 xl:px-10"
              : "justify-center px-5 pt-6 sm:px-8"
          } pb-[calc(32px+env(safe-area-inset-bottom))]`}
        >
          {/* Encabezado del contenido */}

          <div
            className={`animate-fade-up mb-6 ${
              desktopWide
                ? "text-center"
                : "text-left"
            }`}
          >
            {Icon && (
              <span
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm ${
                  desktopWide
                    ? "mx-auto"
                    : ""
                }`}
              >
                <Icon
                  size={27}
                  aria-hidden="true"
                />
              </span>
            )}

            <h1
              className={`font-bold leading-tight tracking-tight text-slate-900 ${
                desktopWide
                  ? "text-3xl sm:text-4xl"
                  : "text-3xl"
              }`}
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className={`mt-3 text-sm leading-relaxed text-slate-500 sm:text-base ${
                  desktopWide
                    ? "mx-auto max-w-xl"
                    : ""
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Contenido de cada página */}

          <div className="w-full min-w-0">
            {children}
          </div>
        </main>

        {/* =================================
            PIE DE PÁGINA DEL PANEL
        ================================= */}

        <footer className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 pb-5 text-center text-[11px] text-slate-400 sm:px-6">

          <span>© RUTABOL-SCZ</span>

          <span aria-hidden="true">·</span>

          <Link
            href="/privacidad"
            className="transition-colors hover:text-emerald-700 hover:underline"
          >
            Privacidad
          </Link>

          <span aria-hidden="true">·</span>

          <Link
            href="/terminos"
            className="transition-colors hover:text-emerald-700 hover:underline"
          >
            Términos
          </Link>

          <span aria-hidden="true">·</span>

          <Link
            href="/#ayuda"
            className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
          >
            Ayuda

            <ArrowUpRight
              size={12}
              aria-hidden="true"
            />
          </Link>
        </footer>
      </div>
    </div>
  );
}

/* =========================================
   MENSAJES DE ERROR
========================================= */

export function ErrorNote({
  text,
}: {
  text: string | null;
}) {
  if (!text) return null;

  return (
    <div
      role="alert"
      className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
        <CircleAlert
          size={19}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          No se pudo completar la operación
        </p>

        <p className="mt-1 wrap-break-word text-xs leading-relaxed text-red-700 sm:text-sm">
          {text}
        </p>
      </div>
    </div>
  );
}
