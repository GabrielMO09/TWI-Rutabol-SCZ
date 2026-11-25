import type { ReactNode } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Bus, House } from "lucide-react";
import "../area.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

/** Mapa público con el mismo diseño del mapa del pasajero, sin menú lateral ni sesión. */
export default function MapaLayout({ children }: { children: ReactNode }) {
  return (
    <div data-area="pasajero" className={`${inter.variable} flex min-h-dvh flex-1 flex-col`}>
      <header className="sticky top-0 z-[1000] flex h-(--psj-header-h) items-center justify-between gap-3 border-b border-(--psj-line) bg-(--psj-surface) px-4 md:px-6">
        <Link href="/" aria-label="RUTABOL-SCZ, ir al inicio" className="flex items-center gap-2 font-bold tracking-tight text-(--psj-green-dark)">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--psj-green) text-white">
            <Bus size={18} aria-hidden="true" />
          </span>
          <span className="max-[359px]:sr-only">RUTABOL-SCZ</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="psj-btn psj-btn-ghost gap-1 px-3">
            <House size={16} aria-hidden="true" />
            <span className="max-sm:sr-only">Volver al inicio</span>
          </Link>
          <Link href="/acceso" className="psj-btn psj-btn-primary px-4">Iniciar sesión</Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
