"use client";

import Link from "next/link";
import {
  ArrowRight,
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
  type LucideIcon,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { useFetch } from "@/lib/api";
import { CATEGORY_LABEL, FARES, type Category } from "@/lib/data";

const FEATURES = [
  {
    icon: MapPin,
    title: "Micros en tiempo real",
    text: "Mira en el mapa los micros activos a menos de 5 km, con línea, interno, ocupación y tiempo estimado de llegada.",
  },
  {
    icon: Gauge,
    title: "Aforo controlado",
    text: "Cada unidad tiene un aforo autorizado. Al llegar al límite se bloquea el ingreso y se avisa a todos.",
  },
  {
    icon: BadgeCheck,
    title: "Tarifa justa y verificada",
    text: "La tarifa estudiantil se aplica solo con acreditación vigente. El chofer no puede cambiar el importe.",
  },
  {
    icon: Repeat,
    title: "Trasbordo sin segundo cobro",
    text: "Si tu micro se avería, pasas a otra unidad con un pase temporal y no pagas de nuevo.",
  },
];

const STEPS = [
  "Consulta rutas y micros cercanos sin crear cuenta.",
  "Regístrate y solicita tu acreditación escolar o universitaria.",
  "Recarga tu Credicard y paga tu pasaje desde el celular.",
  "Muestra tu código QR temporal al chofer y viaja.",
];

const FAQ = [
  ["¿Necesito cuenta para ver los micros?", "No. El mapa, las líneas, las tarifas y el estado del servicio son públicos."],
  ["¿Cuándo pago la tarifa estudiantil?", "Cuando tu acreditación (RUDE o correo institucional) esté aprobada y vigente. Mientras tanto se aplica la tarifa general."],
  ["¿Qué es la Credicard?", "Una tarjeta virtual con saldo que recargas y usas para pagar tus pasajes. En este prototipo la recarga es simulada."],
  ["¿Qué pasa si mi micro se avería?", "El chofer solicita un trasbordo y recibes un pase temporal para la unidad de reemplazo, sin volver a pagar."],
];

const FARE_ICON: Record<Category, LucideIcon> = { escolar: School, universitario: GraduationCap, general: UserRound };

/** Ilustración vectorial: ruta con paradas y un micro. Es decorativa, no muestra datos del servicio. */
function HeroArt() {
  return (
    <svg viewBox="0 0 480 360" fill="none" aria-hidden="true" className="h-auto w-full max-w-md lg:max-w-sm">
      <circle cx="240" cy="180" r="160" fill="#16874C" fillOpacity=".08" />
      <path d="M30 290C110 290 120 190 200 190S300 270 380 220 450 110 450 70" stroke="#16874C" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 16" />
      <path d="M30 120C90 120 140 150 190 130S300 60 360 100" stroke="#103E2C" strokeOpacity=".25" strokeWidth="4" strokeLinecap="round" />
      {[[30, 290], [200, 190], [380, 220], [450, 70]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" fill="#fff" stroke="#16874C" strokeWidth="5" />
          <circle cx={x} cy={y} r="4" fill="#16874C" />
        </g>
      ))}
      <g transform="translate(120 70)">
        <rect width="190" height="100" rx="18" fill="#103E2C" />
        <rect x="14" y="16" width="38" height="30" rx="6" fill="#EAF5EE" />
        <rect x="60" y="16" width="38" height="30" rx="6" fill="#EAF5EE" />
        <rect x="106" y="16" width="38" height="30" rx="6" fill="#EAF5EE" />
        <rect x="152" y="16" width="26" height="62" rx="6" fill="#EAF5EE" />
        <rect x="0" y="60" width="190" height="8" fill="#16874C" />
        <circle cx="48" cy="100" r="15" fill="#172B22" stroke="#fff" strokeWidth="5" />
        <circle cx="146" cy="100" r="15" fill="#172B22" stroke="#fff" strokeWidth="5" />
      </g>
      {/* Etiquetas decorativas: sin importes ni datos del servicio. */}
      <g transform="translate(20 28)">
        <rect width="104" height="34" rx="17" fill="#fff" stroke="#16874C" strokeOpacity=".35" />
        <circle cx="19" cy="17" r="6" fill="#16874C" />
        <text x="32" y="22" fontSize="13" fontWeight="600" fill="#103E2C" fontFamily="system-ui, sans-serif">Rutas</text>
      </g>
      <g transform="translate(262 292)">
        <rect width="196" height="40" rx="20" fill="#fff" stroke="#16874C" strokeOpacity=".35" />
        <path d="M22 14l11 5-11 5-11-5 11-5z" fill="#16874C" />
        <path d="M16 22v5c0 2 3 4 6 4s6-2 6-4v-5l-6 3-6-3z" fill="#16874C" fillOpacity=".6" />
        <text x="44" y="25" fontSize="13" fontWeight="600" fill="#103E2C" fontFamily="system-ui, sans-serif">Tarifa estudiantil</text>
      </g>
      <g transform="translate(372 18)">
        <path d="M24 0C11 0 0 10 0 23c0 17 24 37 24 37s24-20 24-37C48 10 37 0 24 0z" fill="#16874C" />
        <circle cx="24" cy="23" r="9" fill="#fff" />
      </g>
    </svg>
  );
}

export default function Welcome() {
  const { data: fares } = useFetch<{ general: number; escolar: number; universitario: number }>("/public/fares");
  const price = (c: Category) => (fares ? fares[c] : FARES[c]);

  return (
    <PublicShell wide>
      <section className="grid items-center gap-8 rounded-3xl bg-soft px-6 py-10 sm:px-10 lg:mb-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8 lg:px-12 lg:py-8">
        <div className="text-center lg:text-left">
          <p className="mb-2 text-sm font-medium text-brand">Bienvenido a RUTABOL-SCZ</p>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl lg:mb-3 lg:text-4xl">
            El transporte de Santa Cruz, claro y sin sorpresas.
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-muted text-balance lg:mx-0 lg:mb-6">
            Ubica tu micro, conoce la tarifa que te corresponde y paga digitalmente. Pensado para estudiantes, choferes y
            cualquier persona que use el micro en la ciudad.
          </p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:flex-nowrap lg:justify-start lg:gap-2">
            <Link href="/mapa" className="btn btn-primary btn-lg px-8 lg:h-12! lg:px-4! lg:text-[15px]! lg:rounded-lg!">
              <MapPin size={20} />
              Consultar rutas
            </Link>
            <Link href="/acceso" className="btn btn-outline btn-lg border-2 border-brand-dark px-8 lg:h-12! lg:px-4! lg:text-[15px]! lg:rounded-lg!">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="btn btn-outline btn-lg border-2 border-brand-dark px-8 lg:h-12! lg:px-4! lg:text-[15px]! lg:rounded-lg!">
              <UserPlus size={20} />
              Registrarse
            </Link>
          </div>
        </div>
        <div className="hidden justify-center sm:flex">
          <HeroArt />
        </div>
      </section>

      <section aria-labelledby="como" className="py-10 lg:py-6">
        <h2 id="como" className="mb-4 text-xl font-semibold">Cómo funciona</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="card p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
                <Icon size={22} />
              </div>
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="pasos" className="py-10 lg:py-6">
        <h2 id="pasos" className="mb-6 text-xl font-semibold">Empieza a viajar en 4 pasos</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="rounded-xl bg-soft p-5 text-sm">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand font-semibold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tarifas" className="py-10 lg:py-6">
        <h2 id="tarifas" className="mb-4 text-xl font-semibold">Tarifas de referencia</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
            const Icon = FARE_ICON[c];
            return (
              <div key={c} className="card flex flex-col items-center p-6 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-soft text-brand">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <p className="text-sm text-muted">{CATEGORY_LABEL[c]}</p>
                <p className="text-3xl font-bold tabular-nums text-brand-dark">Bs {price(c).toFixed(2)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Valores de referencia; deben verificarse con la normativa vigente antes de operar.
        </p>
      </section>

      <section aria-labelledby="credicard" className="py-10 lg:py-6">
        <div className="grid items-center gap-8 rounded-3xl bg-brand-dark p-6 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-14 lg:px-14">
          <div>
            <h2 id="credicard" className="mb-2 text-2xl font-semibold">Credicard</h2>
            <p className="mb-6 max-w-xl text-white/80">
              Tarjeta virtual con saldo, movimientos, recargas y bloqueo. Cada pago genera un comprobante y un reintento
              nunca cobra dos veces.
            </p>
            <Link href="/registro" className="btn h-12 bg-white px-6 text-brand-dark hover:bg-soft">
              Obtener mi Credicard
              <ArrowRight size={16} />
            </Link>
          </div>
          <div aria-hidden="true" className="relative mx-auto flex aspect-[1.586/1] w-full max-w-sm flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-dark p-6 shadow-2xl ring-1 ring-white/25 lg:max-w-md">
            <svg viewBox="0 0 200 120" fill="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-25">
              <path d="M-10 100C40 100 50 50 100 60S170 20 215 10" stroke="#fff" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
              <circle cx="100" cy="60" r="5" stroke="#fff" strokeWidth="2" />
              <circle cx="170" cy="28" r="5" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold tracking-wide">
                <Bus size={18} />
                RUTABOL-SCZ
              </span>
              <Wifi size={22} className="rotate-90" />
            </div>
            <div className="relative flex items-center gap-4">
              <span className="relative block h-9 w-12 rounded-md bg-gradient-to-br from-amber-200 to-amber-400">
                <span className="absolute inset-x-0 top-1/2 h-px bg-amber-600/40" />
                <span className="absolute inset-y-0 left-1/2 w-px bg-amber-600/40" />
              </span>
            </div>
            <div className="relative flex items-end justify-between">
              <div>
                <p className="text-xl font-semibold tracking-[0.18em]">Credicard</p>
                <p className="text-xs text-white/80">Tarjeta virtual · ilustrativa</p>
              </div>
              <CreditCard size={28} className="text-white/80" />
            </div>
          </div>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-10">
      <section aria-labelledby="ayuda" className="py-10 lg:py-6">
        <h2 id="ayuda" className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <CircleHelp size={22} className="text-brand" />
          Ayuda
        </h2>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 lg:mx-0 lg:max-w-none">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-4 open:bg-soft">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={18} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="personal" className="pb-10 pt-4 lg:py-6">
        <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-soft text-brand">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 id="personal" className="font-semibold">¿Eres chofer o parte del Centro de Control?</h2>
            <p className="text-sm text-muted">Accede a tu panel operativo con las credenciales que te asignó la administración.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:w-full lg:flex-col">
            <Link href="/acceso/chofer" className="btn btn-outline">
              <Bus size={16} aria-hidden="true" />
              Soy chofer
            </Link>
            <Link href="/acceso/control" className="btn btn-primary">
              <Gauge size={16} aria-hidden="true" />
              Centro de Control
            </Link>
          </div>
        </div>
      </section>
      </div>
    </PublicShell>
  );
}
