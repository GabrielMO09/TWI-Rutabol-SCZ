"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CreditCard, MapPin, Users } from "lucide-react";
import { Logo } from "@/components/AppShell";

const STEPS = [
  {
    icon: MapPin,
    title: "Micros en tiempo real",
    text: "Mira en el mapa los micros activos a menos de 5 km, con su línea, número interno y nivel de ocupación.",
  },
  {
    icon: Users,
    title: "Aforo controlado",
    text: "Cada unidad admite entre 18 y 25 pasajeros. Al llegar al límite se bloquea el ingreso y se muestra como Lleno.",
  },
  {
    icon: CreditCard,
    title: "Pago digital sin cobros arbitrarios",
    text: "Paga con tarjeta o billetera digital. La tarifa se calcula sola según tu perfil verificado.",
  },
  {
    icon: BadgeCheck,
    title: "Carnet digital estudiantil",
    text: "Tu foto y tu identidad viajan en la app. El chofer valida que eres tú antes de que subas.",
  },
];

export default function Welcome() {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <Link href="/acceso" className="text-sm font-medium text-brand-dark hover:underline">
          Omitir
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-16">
        <p className="mb-2 text-sm font-medium text-brand">Bienvenido a RUTABOL-SCZ</p>
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          El transporte de Santa Cruz, claro y sin sorpresas.
        </h1>

        <section className="card p-6" aria-live="polite">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-brand">
            <Icon size={24} />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{step.title}</h2>
          <p className="min-h-[72px] leading-relaxed text-muted">{step.text}</p>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-brand" : "w-1.5 bg-line"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {i > 0 && (
                <button className="btn btn-outline" onClick={() => setI(i - 1)}>
                  <ArrowLeft size={16} />
                  Atrás
                </button>
              )}
              {last ? (
                <Link href="/acceso" className="btn btn-primary">
                  Comenzar
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button className="btn btn-primary" onClick={() => setI(i + 1)}>
                  Siguiente
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
