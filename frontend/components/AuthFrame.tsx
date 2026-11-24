import Link from "next/link";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ArrowLeft, Bus, CircleAlert, type LucideIcon } from "lucide-react";
import "@/app/area.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg ${light ? "text-white" : "text-(--psj-green-dark)"}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${light ? "bg-white/15" : "bg-(--psj-green) text-white"}`}>
        <Bus size={20} aria-hidden="true" />
      </span>
      <span className="max-[359px]:sr-only">RUTABOL-SCZ</span>
    </span>
  );
}

/** Ilustración vectorial: rutas que se conectan entre paradas. */
function RoutesArt() {
  return (
    <svg viewBox="0 0 400 260" fill="none" aria-hidden="true" className="h-auto w-full max-w-sm">
      <path d="M20 210C90 210 100 120 170 120S250 190 320 150 380 60 380 40" stroke="#16874C" strokeWidth="6" strokeLinecap="round" />
      <path d="M20 60C80 60 110 100 160 90S260 30 330 70" stroke="#EAF5EE" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M60 250C120 200 200 240 260 210" stroke="#EAF5EE" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" />
      {[[20, 210], [170, 120], [320, 150], [380, 40]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="13" fill="#103E2C" stroke="#16874C" strokeWidth="4" />
          <circle cx={x} cy={y} r="4" fill="#EAF5EE" />
        </g>
      ))}
    </svg>
  );
}

export default function AuthFrame({
  title,
  subtitle,
  back = "/acceso",
  backLabel,
  icon: Icon,
  message = "Movilidad urbana más simple, segura y conectada.",
  children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  backLabel?: string;
  icon?: LucideIcon;
  /** Mensaje institucional del panel lateral (escritorio). */
  message?: string;
  /** Se mantiene por compatibilidad: el ancho del formulario ya es el adecuado. */
  wide?: boolean;
  children: ReactNode;
}) {
  const label = backLabel ?? (back === "/" ? "Volver al inicio" : "Cambiar perfil");
  return (
    <div data-area="auth" className={`${inter.variable} flex min-h-dvh flex-col lg:grid lg:grid-cols-[2fr_3fr]`}>
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-(--psj-green-dark) p-10 text-white lg:flex">
        <Link href="/" aria-label="RUTABOL-SCZ, ir al inicio"><Brand light /></Link>
        <div className="flex flex-col gap-8">
          <RoutesArt />
          <div>
            <p className="text-3xl font-semibold leading-tight tracking-tight">{message}</p>
            <p className="mt-3 text-sm text-white/80">Transporte público de Santa Cruz de la Sierra, Bolivia.</p>
          </div>
        </div>
        <p className="text-xs text-white/70">© RUTABOL-SCZ</p>
      </aside>

      <div className="flex flex-1 flex-col bg-(--psj-bg)">
        <header className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Inicio" className="lg:invisible"><Brand /></Link>
          <Link href={back} className="psj-btn psj-btn-ghost gap-1 px-3">
            <ArrowLeft size={16} aria-hidden="true" />
            {label}
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-4 sm:px-6">
          {Icon && (
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-(--psj-green-soft) text-(--psj-green)">
              <Icon size={24} aria-hidden="true" />
            </span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mb-6 mt-1 text-sm text-(--psj-muted-strong)">{subtitle}</p> : <div className="mb-6" />}
          {children}
        </main>
      </div>
    </div>
  );
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-(--psj-danger-soft) px-3 py-2 text-sm text-[#991b1b]">
      <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {text}
    </p>
  );
}
