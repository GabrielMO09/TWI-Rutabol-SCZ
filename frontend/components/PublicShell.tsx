"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Home, LogIn, Map, UserPlus } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { useApp } from "@/lib/store";

const HOME: Record<string, string> = { pasajero: "/pasajero", chofer: "/chofer", control: "/control" };

/** Marco para páginas que cualquier visitante puede ver sin cuenta. */
export default function PublicShell({ children, wide = false, backHome = false }: { children: ReactNode; wide?: boolean; backHome?: boolean }) {
  const { profile, logout } = useApp();
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Inicio">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/mapa" aria-label="Rutas y mapa" className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-soft">
              <Map size={16} />
              <span className="hidden sm:inline">Rutas y mapa</span>
            </Link>
            {profile ? (
              <Link href={HOME[profile.role]} className="btn btn-primary h-9">
                Mi panel
              </Link>
            ) : (
              <>
                <Link href="/acceso" aria-label="Iniciar sesión" className="btn btn-outline h-9">
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </Link>
                <Link href="/registro" aria-label="Registrarse" className="btn btn-primary h-9">
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Registrarse</span>
                </Link>
              </>
            )}
            {backHome && (profile ? (
              <button
                className="btn btn-outline h-9"
                aria-label="Volver al inicio"
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
              >
                <Home size={16} />
                <span className="hidden sm:inline">Volver al inicio</span>
              </button>
            ) : (
              <Link href="/" aria-label="Volver al inicio" className="btn btn-outline h-9">
                <Home size={16} />
                <span className="hidden sm:inline">Volver al inicio</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-5 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>
      <footer className="border-t border-line bg-soft">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm text-muted sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs">Transporte público de Santa Cruz de la Sierra, Bolivia: micros en tiempo real, aforo y pago digital.</p>
          </div>
          <nav aria-label="Plataforma" className="flex flex-col">
            <p className="mb-1 font-semibold text-ink">Plataforma</p>
            <Link href="/mapa" className="tap hover:text-ink hover:underline">Rutas y mapa</Link>
            <Link href="/acceso" className="tap hover:text-ink hover:underline">Iniciar sesión</Link>
            <Link href="/registro" className="tap hover:text-ink hover:underline">Registrarse</Link>
          </nav>
          <nav aria-label="Legal y contacto" className="flex flex-col">
            <p className="mb-1 font-semibold text-ink">Información</p>
            <Link href="/terminos" className="tap hover:text-ink hover:underline">Términos</Link>
            <Link href="/privacidad" className="tap hover:text-ink hover:underline">Privacidad</Link>
            <a href="mailto:contacto@rutabol.bo" className="tap hover:text-ink hover:underline">Contacto</a>
          </nav>
        </div>
        <p className="border-t border-line px-4 py-3 text-center text-xs text-muted">© RUTABOL-SCZ</p>
      </footer>
    </div>
  );
}
