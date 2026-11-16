"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bus,
  CircleHelp,
  CreditCard,
  Gauge,
  MapPin,
  Repeat,
  ShieldCheck,
  UserPlus,
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

export default function Welcome() {
  const { data: fares } = useFetch<{ general: number; escolar: number; universitario: number }>("/public/fares");
  const price = (c: Category) => (fares ? fares[c] : FARES[c]);

  return (
    <PublicShell wide>
      <section className="mx-auto max-w-3xl py-8 text-center sm:py-12">
        <p className="mb-2 text-sm font-medium text-brand">Bienvenido a RUTABOL-SCZ</p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          El transporte de Santa Cruz, claro y sin sorpresas.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-muted text-balance">
          Ubica tu micro, conoce la tarifa que te corresponde y paga digitalmente. Pensado para estudiantes, choferes y
          cualquier persona que use el micro en la ciudad.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Link href="/mapa" className="btn btn-primary btn-lg px-8">
            <MapPin size={20} />
            Consultar rutas
          </Link>
          <Link href="/acceso" className="btn btn-outline btn-lg border-2 border-brand-dark px-8">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn btn-outline btn-lg border-2 border-brand-dark px-8">
            <UserPlus size={20} />
            Registrarse
          </Link>
        </div>
      </section>

      <section aria-labelledby="como" className="py-8">
        <h2 id="como" className="mb-4 text-xl font-semibold">Cómo funciona</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
        <ol className="mt-6 grid gap-3 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="rounded-xl bg-soft p-4 text-sm">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand font-semibold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tarifas" className="py-8">
        <h2 id="tarifas" className="mb-4 text-xl font-semibold">Tarifas vigentes</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <div key={c} className="card p-5 text-center">
              <p className="text-sm text-muted">{CATEGORY_LABEL[c]}</p>
              <p className="text-3xl font-bold tabular-nums text-brand-dark">Bs {price(c).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Valores de referencia; deben verificarse con la normativa vigente antes de operar.
        </p>
      </section>

      <section aria-labelledby="credicard" className="py-8">
        <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <CreditCard size={28} />
          </span>
          <div className="flex-1">
            <h2 id="credicard" className="text-xl font-semibold">Credicard</h2>
            <p className="text-sm text-muted">
              Tarjeta virtual con saldo, movimientos, recargas y bloqueo. Cada pago genera un comprobante y un reintento
              nunca cobra dos veces.
            </p>
          </div>
          <Link href="/registro" className="btn btn-primary">
            Obtener mi Credicard
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section aria-labelledby="ayuda" className="py-8">
        <h2 id="ayuda" className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <CircleHelp size={22} className="text-brand" />
          Ayuda
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card p-4">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} className="text-brand" />
          ¿Eres chofer o parte del Centro de Control?{" "}
          <Link href="/acceso" className="font-medium text-brand underline">
            Ingresa aquí
          </Link>
          <Bus size={16} className="text-brand" />
        </p>
      </section>
    </PublicShell>
  );
}
