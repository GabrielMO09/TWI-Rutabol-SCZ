
"use client";

import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bus,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Gauge,
  GraduationCap,
  MapPin,
  Repeat,
  School,
  ShieldCheck,
  UserPlus,
  UserRound,
  Wifi,
  Navigation,
  Smartphone,
  Route,
  CheckCircle2,
  Wallet,
  QrCode,
  type LucideIcon,
} from "lucide-react";

import PublicShell from "@/components/PublicShell";
import { useFetch } from "@/lib/api";
import { CATEGORY_LABEL, FARES, type Category } from "@/lib/data";

/* =========================================
   FUNCIONALIDADES PRINCIPALES
========================================= */

const FEATURES = [
  {
    icon: MapPin,
    title: "Micros en tiempo real",
    text: "Consulta los micros activos a menos de 5 km, conoce su ubicación, línea, ocupación y tiempo estimado de llegada.",
    color: "bg-emerald-50 text-emerald-700",
    number: "01",
  },
  {
    icon: Gauge,
    title: "Aforo controlado",
    text: "Cada unidad cuenta con un aforo autorizado. Al alcanzar su capacidad máxima, el sistema bloquea nuevos ingresos.",
    color: "bg-blue-50 text-blue-600",
    number: "02",
  },
  {
    icon: BadgeCheck,
    title: "Tarifas verificadas",
    text: "Accede a la tarifa que te corresponde según tu acreditación. El conductor no puede modificar el importe.",
    color: "bg-amber-50 text-amber-700",
    number: "03",
  },
  {
    icon: Repeat,
    title: "Trasbordos seguros",
    text: "Si tu micro presenta una avería, continúa tu viaje en otra unidad mediante un pase temporal, sin pagar nuevamente.",
    color: "bg-violet-50 text-violet-600",
    number: "04",
  },
];

/* =========================================
   PASOS PARA VIAJAR
========================================= */

const STEPS = [
  {
    icon: MapPin,
    title: "Encuentra tu ruta",
    text: "Consulta las rutas y micros cercanos sin necesidad de crear una cuenta.",
  },
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    text: "Regístrate y solicita tu acreditación escolar o universitaria.",
  },
  {
    icon: Wallet,
    title: "Recarga tu saldo",
    text: "Recarga tu Credicard y paga tus pasajes desde tu celular.",
  },
  {
    icon: QrCode,
    title: "Disfruta tu viaje",
    text: "Muestra tu código QR temporal al conductor y comienza tu recorrido.",
  },
];

/* =========================================
   PREGUNTAS FRECUENTES
========================================= */

const FAQ = [
  {
    question: "¿Necesito una cuenta para ver los micros?",
    answer:
      "No. El mapa, las líneas, las tarifas y el estado del servicio son públicos. Puedes consultarlos sin registrarte.",
  },
  {
    question: "¿Cuándo puedo pagar la tarifa estudiantil?",
    answer:
      "Cuando tu acreditación mediante RUDE o correo institucional esté aprobada y vigente. Mientras tanto, se aplica la tarifa general.",
  },
  {
    question: "¿Qué es la Credicard?",
    answer:
      "Es una tarjeta virtual con saldo que puedes utilizar para pagar tus pasajes. En este prototipo, las recargas son simuladas.",
  },
  {
    question: "¿Qué sucede si mi micro presenta una avería?",
    answer:
      "El conductor solicita un trasbordo y recibes un pase temporal para continuar tu viaje en una unidad de reemplazo, sin volver a pagar.",
  },
];

/* =========================================
   CONFIGURACION DE TARIFAS
========================================= */

const FARE_ICON: Record<Category, LucideIcon> = {
  escolar: School,
  universitario: GraduationCap,
  general: UserRound,
};

const FARE_DESCRIPTION: Record<Category, string> = {
  escolar: "Estudiantes de unidades educativas con acreditación vigente.",
  universitario: "Estudiantes universitarios con acreditación vigente.",
  general: "Pasajeros que utilizan el transporte público.",
};

/* =========================================
   ENCABEZADOS DE SECCION
========================================= */

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-10">
      <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {eyebrow}
      </span>

      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
      >
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
        {description}
      </p>
    </div>
  );
}

/* =========================================
   ILUSTRACION DEL TRANSPORTE
========================================= */

function HeroArt() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[520px]"
    >
      {/* Resplandor de fondo */}

      <div className="absolute inset-12 rounded-full bg-emerald-400/20 blur-3xl" />

      <svg
        viewBox="0 0 520 420"
        fill="none"
        className="relative h-auto w-full"
      >
        <defs>
          <linearGradient
            id="hero-bus"
            x1="0"
            y1="0"
            x2="290"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFFFF" />

            <stop offset="1" stopColor="#D1FAE5" />
          </linearGradient>

          <linearGradient
            id="hero-ground"
            x1="0"
            y1="0"
            x2="520"
            y2="420"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFFFF" stopOpacity=".14" />

            <stop
              offset="1"
              stopColor="#FFFFFF"
              stopOpacity=".02"
            />
          </linearGradient>
        </defs>

        {/* Fondo circular */}

        <circle
          cx="260"
          cy="210"
          r="170"
          fill="url(#hero-ground)"
        />

        <circle
          cx="260"
          cy="210"
          r="190"
          stroke="#FFFFFF"
          strokeOpacity=".08"
          strokeDasharray="5 9"
        />

        {/* Calles decorativas */}

        {[80, 160, 240, 320, 400, 480].map((x) => (
          <path
            key={`street-x-${x}`}
            d={`M${x} 35V385`}
            stroke="#FFFFFF"
            strokeOpacity=".06"
          />
        ))}

        {[70, 140, 210, 280, 350].map((y) => (
          <path
            key={`street-y-${y}`}
            d={`M30 ${y}H490`}
            stroke="#FFFFFF"
            strokeOpacity=".06"
          />
        ))}

        {/* Ruta principal */}

        <path
          d="M35 338C115 338 95 250 183 250S330 310 407 225 475 130 475 66"
          stroke="#6EE7B7"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="2 18"
        />

        <path
          d="M45 125C115 125 150 180 220 130S330 65 390 100"
          stroke="#FFFFFF"
          strokeOpacity=".22"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Paradas */}

        {[
          [35, 338],
          [183, 250],
          [407, 225],
          [475, 66],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle
              cx={x}
              cy={y}
              r="17"
              fill="#10B981"
              fillOpacity=".25"
            />

            <circle
              cx={x}
              cy={y}
              r="10"
              fill="#FFFFFF"
              stroke="#10B981"
              strokeWidth="4"
            />

            <circle
              cx={x}
              cy={y}
              r="3"
              fill="#047857"
            />
          </g>
        ))}

        {/* Sombra del micro */}

        <ellipse
          cx="262"
          cy="293"
          rx="165"
          ry="20"
          fill="#000000"
          fillOpacity=".17"
        />

        {/* Micro */}

        <g transform="translate(110 130)">
          <rect
            width="290"
            height="150"
            rx="25"
            fill="url(#hero-bus)"
          />

          <rect
            x="15"
            y="18"
            width="56"
            height="49"
            rx="8"
            fill="#064E3B"
          />

          <rect
            x="80"
            y="18"
            width="56"
            height="49"
            rx="8"
            fill="#064E3B"
          />

          <rect
            x="145"
            y="18"
            width="56"
            height="49"
            rx="8"
            fill="#064E3B"
          />

          <rect
            x="210"
            y="18"
            width="61"
            height="110"
            rx="9"
            fill="#064E3B"
          />

          <path
            d="M240 18V128"
            stroke="#FFFFFF"
            strokeOpacity=".20"
            strokeWidth="2"
          />

          <rect
            y="82"
            width="290"
            height="12"
            fill="#10B981"
          />

          <rect
            x="15"
            y="110"
            width="55"
            height="10"
            rx="5"
            fill="#059669"
          />

          <circle
            cx="64"
            cy="150"
            r="23"
            fill="#0F172A"
            stroke="#D1FAE5"
            strokeWidth="6"
          />

          <circle
            cx="64"
            cy="150"
            r="8"
            fill="#64748B"
          />

          <circle
            cx="234"
            cy="150"
            r="23"
            fill="#0F172A"
            stroke="#D1FAE5"
            strokeWidth="6"
          />

          <circle
            cx="234"
            cy="150"
            r="8"
            fill="#64748B"
          />

          <text
            x="110"
            y="112"
            fill="#064E3B"
            fontSize="14"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            RUTABOL
          </text>
        </g>

        {/* Ubicacion decorativa */}

        <g transform="translate(390 30)">
          <path
            d="M30 0C13 0 0 13 0 29C0 50 30 75 30 75S60 50 60 29C60 13 47 0 30 0Z"
            fill="#34D399"
          />

          <circle cx="30" cy="29" r="11" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Tarjeta flotante superior */}

      <div className="animate-fade-up absolute left-0 top-[12%] flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-3 text-slate-900 shadow-2xl sm:left-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Navigation size={20} />
        </span>

        <div>
          <p className="text-xs text-slate-500">Movilidad urbana</p>

          <p className="text-sm font-bold">Consulta de rutas</p>
        </div>
      </div>

      {/* Tarjeta flotante inferior */}

      <div className="animate-fade-up delay-200 absolute bottom-[6%] right-0 flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-3 text-slate-900 shadow-2xl sm:right-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <GraduationCap size={21} />
        </span>

        <div>
          <p className="text-xs text-slate-500">Beneficios</p>

          <p className="text-sm font-bold">Tarifa estudiantil</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   TARJETA VIRTUAL CREDICARD
========================================= */

function CredicardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] px-2 py-4">
      <div className="absolute inset-6 rounded-3xl bg-emerald-400/25 blur-3xl" />

      <div className="relative aspect-[1.586/1] overflow-hidden rounded-[24px] border border-white/25 bg-linear-to-br from-emerald-500 via-emerald-700 to-emerald-950 p-5 text-white shadow-2xl sm:p-7">
        {/* Decoracion */}

        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15" />

        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/15" />

        <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/5" />

        <svg
          viewBox="0 0 400 250"
          fill="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        >
          <path
            d="M-20 220C90 220 80 90 210 110S340 50 420 15"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeDasharray="3 9"
          />

          <circle
            cx="210"
            cy="110"
            r="8"
            stroke="#FFFFFF"
            strokeWidth="3"
          />

          <circle
            cx="340"
            cy="50"
            r="8"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </svg>

        <div className="relative flex h-full flex-col justify-between">
          {/* Marca */}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus size={22} />

              <span className="text-sm font-bold tracking-wide">
                RUTABOL-SCZ
              </span>
            </div>

            <Wifi size={25} className="rotate-90" />
          </div>

          {/* Chip */}

          <div className="flex items-center justify-between">
            <div className="relative h-10 w-14 overflow-hidden rounded-lg bg-linear-to-br from-amber-100 via-amber-300 to-amber-500 shadow-lg">
              <div className="absolute inset-x-0 top-1/3 h-px bg-amber-700/40" />

              <div className="absolute inset-x-0 bottom-1/3 h-px bg-amber-700/40" />

              <div className="absolute inset-y-0 left-1/3 w-px bg-amber-700/40" />

              <div className="absolute inset-y-0 right-1/3 w-px bg-amber-700/40" />
            </div>

            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-widest">
              Digital
            </span>
          </div>

          {/* Nombre */}

          <div>
            <p className="mb-2 font-mono text-sm tracking-[0.20em] text-white/80 sm:text-lg">
              •••• &nbsp; •••• &nbsp; •••• &nbsp; ••••
            </p>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold tracking-widest sm:text-2xl">
                  CREDICARD
                </p>

                <p className="mt-1 text-[10px] text-white/75 sm:text-xs">
                  Tarjeta virtual · Ilustrativa
                </p>
              </div>

              <CreditCard
                size={32}
                className="text-white/85"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   PAGINA PRINCIPAL
========================================= */

export default function Welcome() {
  const { data: fares } = useFetch<{
    general: number;
    escolar: number;
    universitario: number;
  }>("/public/fares");

  const price = (category: Category) =>
    fares ? fares[category] : FARES[category];

  return (
    <PublicShell wide>
      <div className="mx-auto w-full max-w-[1440px]">

        {/* =================================
            PORTADA PRINCIPAL
        ================================= */}

        <section className="relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white shadow-xl sm:rounded-[36px]">

          {/* Decoraciones de fondo */}

          <div className="pointer-events-none absolute -right-36 -top-44 h-[500px] w-[500px] rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-48 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-3xl" />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          <div className="relative grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-4 lg:px-12 lg:py-12 xl:px-16 xl:py-16">

            {/* Contenido principal */}

            <div className="animate-fade-up text-center lg:text-left">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Movilidad urbana inteligente
              </div>

              <h1 className="text-balance text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.3rem] xl:text-6xl">
                Tu ciudad.
                <br />

                Tu ruta.
                <br />

                <span className="text-emerald-300">
                  Tu manera de viajar.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-relaxed text-emerald-50/85 sm:text-base lg:mx-0 lg:text-lg">
                Descubre una nueva forma de moverte por Santa Cruz.
                Encuentra tu micro, consulta las tarifas y paga tus
                pasajes digitalmente con RUTABOL-SCZ.
              </p>

              {/* Acciones principales */}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                <Link
                  href="/mapa"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-950 shadow-lg transition-all hover:-translate-y-1 hover:bg-emerald-50"
                >
                  <MapPin size={19} />

                  Explorar rutas

                  <ArrowRight size={17} />
                </Link>

                <Link
                  href="/acceso"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-1 hover:bg-white/20"
                >
                  <UserRound size={18} />

                  Iniciar sesión
                </Link>

                <Link
                  href="/registro"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-transparent px-5 py-3.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <UserPlus size={18} />

                  Registrarse
                </Link>
              </div>

              {/* Caracteristicas resumidas */}

              <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-emerald-100/90 lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-300"
                  />

                  Consulta pública
                </span>

                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-300"
                  />

                  Pagos digitales
                </span>

                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-300"
                  />

                  Tarifas verificadas
                </span>
              </div>
            </div>

            {/* Ilustracion */}

            <div className="animate-scale-in hidden justify-center sm:flex">
              <HeroArt />
            </div>
          </div>
        </section>

        {/* =================================
            ACCESOS RAPIDOS
        ================================= */}

        <section
          aria-label="Accesos rápidos"
          className="relative z-10 mx-auto mt-5 grid gap-3 sm:grid-cols-3 lg:mt-6 lg:gap-4"
        >
          {[
            {
              icon: Route,
              title: "Consulta de rutas",
              text: "Explora el transporte de la ciudad",
              href: "/mapa",
            },
            {
              icon: CreditCard,
              title: "Tu Credicard",
              text: "Accede a tu billetera digital",
              href: "/acceso",
            },
            {
              icon: GraduationCap,
              title: "Beneficios estudiantiles",
              text: "Conoce las tarifas disponibles",
              href: "#tarifas",
            },
          ].map(({ icon: Icon, title, text, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg lg:p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Icon size={23} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {title}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {text}
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="shrink-0 text-slate-400 transition-colors group-hover:text-emerald-600"
              />
            </Link>
          ))}
        </section>

        {/* =================================
            FUNCIONALIDADES
        ================================= */}

        <section
          aria-labelledby="como"
          className="py-12 sm:py-16"
        >
          <SectionHeading
            id="como"
            eyebrow="Una mejor experiencia"
            title="Todo lo que necesitas para viajar"
            description="Una plataforma diseñada para facilitar el transporte urbano y mejorar la experiencia de pasajeros y conductores."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(
              ({ icon: Icon, title, text, color, number }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-xl"
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-4 top-2 text-5xl font-black text-slate-100"
                  >
                    {number}
                  </span>

                  <div
                    className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${color}`}
                  >
                    <Icon size={26} />
                  </div>

                  <h3 className="relative mb-3 text-base font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="text-sm leading-relaxed text-slate-500">
                    {text}
                  </p>

                  <div className="mt-5 h-1 w-10 rounded-full bg-emerald-200 transition-all duration-300 group-hover:w-full group-hover:bg-emerald-500" />
                </article>
              )
            )}
          </div>
        </section>

        {/* =================================
            COMO EMPEZAR
        ================================= */}

        <section
          aria-labelledby="pasos"
          className="rounded-[28px] border border-emerald-100 bg-linear-to-br from-white via-emerald-50/60 to-emerald-50 px-5 py-10 sm:px-8 lg:px-10 lg:py-12"
        >
          <SectionHeading
            id="pasos"
            eyebrow="Fácil y rápido"
            title="Comienza a viajar en 4 pasos"
            description="Conoce cómo utilizar RUTABOL-SCZ desde tu celular o computadora."
          />

          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-8 hidden border-t-2 border-dashed border-emerald-200 lg:block"
            />

            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="relative flex flex-col items-center rounded-2xl p-4 text-center"
              >
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-md ring-1 ring-emerald-100">
                    <Icon size={27} />
                  </div>

                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <h3 className="mb-2 font-bold text-slate-900">
                  {title}
                </h3>

                <p className="max-w-[240px] text-sm leading-relaxed text-slate-500">
                  {text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex justify-center">
            <Link
              href="/registro"
              className="btn btn-primary min-h-12 gap-3 px-7"
            >
              Comenzar ahora

              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* =================================
            TARIFAS
        ================================= */}

        <section
          aria-labelledby="tarifas"
          className="py-12 sm:py-16"
        >
          <SectionHeading
            id="tarifas"
            eyebrow="Transparencia"
            title="Viaja con la tarifa que te corresponde"
            description="Consulta los precios de referencia disponibles para cada categoría de pasajero."
          />

          <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map(
              (category) => {
                const Icon = FARE_ICON[category];

                const student =
                  category === "escolar" ||
                  category === "universitario";

                return (
                  <article
                    key={category}
                    className="group relative flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl lg:p-8"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-700 to-emerald-400" />

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <Icon size={30} aria-hidden="true" />
                    </div>

                    <h3 className="text-base font-bold text-slate-800">
                      {CATEGORY_LABEL[category]}
                    </h3>

                    <div className="my-4 flex items-baseline justify-center gap-1">
                      <span className="text-lg font-semibold text-emerald-700">
                        Bs
                      </span>

                      <span className="text-5xl font-extrabold tracking-tight text-emerald-900 tabular-nums">
                        {price(category).toFixed(2)}
                      </span>
                    </div>

                    <span className="mb-4 text-xs font-medium text-slate-400">
                      Por viaje
                    </span>

                    <p className="mx-auto max-w-xs flex-1 text-sm leading-relaxed text-slate-500">
                      {FARE_DESCRIPTION[category]}
                    </p>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <BadgeCheck size={15} />

                        {student
                          ? "Requiere acreditación"
                          : "Tarifa general"}
                      </span>
                    </div>
                  </article>
                );
              }
            )}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
            Valores de referencia; deben verificarse con la normativa
            vigente antes de operar.
            {!fares && " Se muestran los valores predeterminados del sistema."}
          </p>
        </section>

        {/* =================================
            CREDICARD
        ================================= */}

        <section aria-labelledby="credicard">
          <div className="relative isolate overflow-hidden rounded-[30px] bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-6 py-10 text-white shadow-xl sm:px-10 lg:px-12 lg:py-12">

            <div className="pointer-events-none absolute -right-36 -top-36 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">

              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  <CreditCard size={15} />

                  Billetera digital
                </div>

                <h2
                  id="credicard"
                  className="text-4xl font-bold tracking-tight sm:text-5xl"
                >
                  Tu viaje comienza
                  <br />

                  con <span className="text-emerald-300">Credicard.</span>
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-relaxed text-emerald-50/80 sm:text-base">
                  Gestiona tus pasajes desde una tarjeta virtual.
                  Consulta tu saldo, realiza recargas, revisa tus
                  movimientos y mantén el control de tus pagos.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: Wallet,
                      text: "Consulta de saldo",
                    },
                    {
                      icon: Smartphone,
                      text: "Recargas digitales",
                    },
                    {
                      icon: ShieldCheck,
                      text: "Bloqueo de tarjeta",
                    },
                    {
                      icon: BadgeCheck,
                      text: "Comprobantes de pago",
                    },
                  ].map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-emerald-50"
                    >
                      <Icon
                        size={19}
                        className="shrink-0 text-emerald-300"
                      />

                      {text}
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-relaxed text-emerald-100/75">
                  Cada pago genera un comprobante y los reintentos
                  no generan un segundo cobro.
                </p>

                <div className="mt-7">
                  <Link
                    href="/registro"
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-950 shadow-md transition-all hover:-translate-y-1 hover:bg-emerald-50"
                  >
                    Obtener mi Credicard

                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              <div aria-hidden="true">
                <CredicardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* =================================
            PREGUNTAS FRECUENTES
        ================================= */}

        <section
          aria-labelledby="ayuda"
          className="py-12 sm:py-16"
        >
          <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">

            {/* Presentacion */}

            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <CircleHelp size={15} />

                Centro de ayuda
              </span>

              <h2
                id="ayuda"
                className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl"
              >
                ¿Tienes alguna
                <br />

                <span className="text-emerald-700">
                  pregunta?
                </span>
              </h2>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
                Encuentra las respuestas a las preguntas más
                frecuentes sobre el transporte, las tarifas y
                el funcionamiento de RUTABOL-SCZ.
              </p>

              <div className="mt-6">
                <Link
                  href="/mapa"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-950"
                >
                  Explorar el sistema

                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            {/* Preguntas desplegables */}

            <div className="flex flex-col gap-3">
              {FAQ.map(({ question, answer }, index) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors open:border-emerald-200 open:bg-emerald-50/60"
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden sm:p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex-1">{question}</span>

                    <ChevronDown
                      size={19}
                      aria-hidden="true"
                      className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 group-open:text-emerald-700"
                    />
                  </summary>

                  <div className="px-5 pb-5 sm:pl-[64px]">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* =================================
            ACCESO DEL PERSONAL
        ================================= */}

        <section
          aria-labelledby="personal"
          className="pb-8"
        >
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={28} />
                </span>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Acceso operativo
                  </span>

                  <h2
                    id="personal"
                    className="mt-1 text-xl font-bold tracking-tight text-slate-900"
                  >
                    ¿Eres parte del equipo de transporte?
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                    Accede a tu panel de conductor o Centro de Control
                    con las credenciales asignadas por la administración.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">

                <Link
                  href="/acceso/chofer"
                  className="btn btn-outline min-h-12 gap-2 px-5"
                >
                  <Bus size={18} aria-hidden="true" />

                  Soy chofer
                </Link>

                <Link
                  href="/acceso/control"
                  className="btn btn-primary min-h-12 gap-2 px-5"
                >
                  <Gauge size={18} aria-hidden="true" />

                  Centro de Control
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
