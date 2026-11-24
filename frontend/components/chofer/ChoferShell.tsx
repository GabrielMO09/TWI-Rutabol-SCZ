"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bus, Gauge, House, Repeat, ScanFace, TriangleAlert, type LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/pasajero/ui";
import { useApp } from "@/lib/store";

interface Item {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  { href: "/chofer", label: "Jornada y aforo", title: "Jornada y aforo", icon: Gauge },
  { href: "/chofer/validacion", label: "Validar y cobrar", title: "Validar y cobrar", icon: ScanFace },
  { href: "/chofer/incidentes", label: "Incidentes", title: "Incidentes", icon: TriangleAlert },
  { href: "/chofer/trasbordo", label: "Trasbordos", title: "Trasbordos", icon: Repeat },
];

const isActive = (path: string, href: string) => (href === "/chofer" ? path === href : path.startsWith(href));

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-bold tracking-tight text-(--psj-green-dark)">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--psj-green) text-white">
        <Bus size={18} aria-hidden="true" />
      </span>
      {!compact && <span>RUTABOL-SCZ</span>}
    </span>
  );
}

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--psj-danger) px-1.5 text-xs font-bold text-white">
      <span className="sr-only">{n} pendientes: </span>
      {n}
    </span>
  );
}

export default function ChoferShell({ children }: { children: ReactNode }) {
  const { ready, profile, world, logout } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const menuBox = useRef<HTMLDivElement>(null);
  const allowed = ready && profile?.role === "chofer";

  useEffect(() => {
    if (ready && profile?.role !== "chofer") router.replace("/acceso");
  }, [ready, profile, router]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && menuBox.current?.contains(e.target as Node)) return;
      setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  if (!allowed) {
    return <div className="flex flex-1 items-center justify-center text-sm text-(--psj-muted-strong)">Cargando...</div>;
  }

  const bus = world.buses.find((b) => b.id === profile!.busId);
  const pending = world.reqs.filter((r) => r.busId === profile!.busId).length;
  const onDuty = world.jornada?.onDuty ?? bus?.onDuty ?? false;
  const current = ITEMS.filter((i) => isActive(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const badge = (href: string) => (href === "/chofer/validacion" ? pending : 0);

  function goHome() {
    logout();
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="psj-side sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-(--psj-line) bg-(--psj-surface) md:flex">
        <div className="flex h-(--psj-header-h) items-center justify-center border-b border-(--psj-line) px-3">
          <Link href="/chofer" aria-label="RUTABOL-SCZ, ir al panel">
            <span className="hidden lg:block"><Brand /></span>
            <span className="lg:hidden"><Brand compact /></span>
          </Link>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 p-3">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={current?.href === item.href ? "page" : undefined}
              className="psj-side-link"
            >
              <item.icon size={20} aria-hidden="true" className="shrink-0" />
              <span className="psj-side-label truncate">{item.label}</span>
              <span className="psj-side-label ml-auto"><Count n={badge(item.href)} /></span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1000] flex h-(--psj-header-h) items-center justify-between gap-3 border-b border-(--psj-line) bg-(--psj-surface) px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden"><Brand /></span>
            <p className="hidden truncate text-lg font-semibold md:block">{current?.title ?? "Panel del chofer"}</p>
          </div>
          <div className="flex items-center gap-2">
            {bus && (
              <span className="hidden text-sm text-(--psj-muted-strong) sm:block">
                Línea {bus.line} · Interno {bus.internal}
              </span>
            )}
            <StatusPill tone={onDuty ? "success" : "warn"}>{onDuty ? "En servicio" : "Fuera de servicio"}</StatusPill>
            <div ref={menuBox} className="relative">
              <button
                type="button"
                aria-label="Menú de usuario"
                aria-expanded={menu}
                onClick={() => setMenu((o) => !o)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-(--psj-green-soft) text-sm font-semibold text-(--psj-green-dark) transition-colors hover:bg-[#d8ecdf]"
              >
                {profile!.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?"}
              </button>
              {menu && (
                <div className="psj-card psj-card-shadow absolute right-0 top-12 z-[1100] w-60 p-2">
                  <p className="truncate px-3 py-2 text-sm font-semibold">{profile!.name}</p>
                  <button type="button" onClick={goHome} aria-label="Volver al inicio" className="psj-side-link w-full text-left">
                    <House size={18} aria-hidden="true" />
                    Volver al inicio
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] md:px-6 md:pb-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-(--psj-line) bg-(--psj-surface) md:hidden"
      >
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current?.href === item.href ? "page" : undefined}
            className="psj-bottom-link relative h-(--psj-nav-h)"
          >
            <item.icon size={22} aria-hidden="true" />
            {item.label.split(" ")[0]}
            {badge(item.href) > 0 && (
              <span className="absolute right-[calc(50%-24px)] top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--psj-danger) px-1 text-[10px] font-bold text-white">
                <span className="sr-only">{badge(item.href)} pendientes</span>
                <span aria-hidden="true">{badge(item.href)}</span>
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
