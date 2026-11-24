"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck, Banknote, Bus, Ellipsis, FileDown, House, LayoutDashboard, MapPin, MessageSquareWarning,
  School, ScrollText, TriangleAlert, Users, type LucideIcon,
} from "lucide-react";
import { Sheet } from "@/components/pasajero/ui";
import { useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { Overview } from "@/components/control/types";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const isActive = (path: string, href: string) => (href === "/control" ? path === href : path.startsWith(href));

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

function Count({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--psj-danger) px-1.5 text-xs font-bold text-white">
      <span className="sr-only">{n} pendientes: </span>
      {n}
    </span>
  );
}

export default function ControlShell({ children }: { children: ReactNode }) {
  const { ready, profile, logout } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuBox = useRef<HTMLDivElement>(null);
  const allowed = ready && profile?.role === "control";
  const { data } = useFetch<Overview>(allowed ? "/control/overview" : null, 5000);

  useEffect(() => {
    if (ready && profile?.role !== "control") router.replace("/acceso");
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

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Operación",
      items: [
        { href: "/control", label: "Resumen", icon: LayoutDashboard },
        { href: "/control/acreditaciones", label: "Acreditaciones", icon: BadgeCheck, badge: data?.kpis.acreditacionesPendientes },
        { href: "/control/reclamos", label: "Reclamos", icon: MessageSquareWarning },
        { href: "/control/incidentes", label: "Incidentes", icon: TriangleAlert },
      ],
    },
    {
      title: "Red de transporte",
      items: [
        { href: "/control/flota", label: "Micro", icon: Bus },
        { href: "/control/paradas", label: "Paradas", icon: MapPin },
        { href: "/control/instituciones", label: "Instituciones", icon: School },
        { href: "/control/tarifas", label: "Tarifas", icon: Banknote },
      ],
    },
    {
      title: "Administración",
      items: [
        { href: "/control/usuarios", label: "Usuarios", icon: Users },
        { href: "/control/auditoria", label: "Auditoría", icon: ScrollText },
        { href: "/control/reportes", label: "Reportes", icon: FileDown },
      ],
    },
  ];
  const all = groups.flatMap((g) => g.items);
  const current = all.filter((i) => isActive(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const primary = all.slice(0, 4);
  const rest = all.slice(4);
  const moreActive = rest.some((i) => isActive(path, i.href));

  function goHome() {
    logout();
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="psj-side sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-(--psj-line) bg-(--psj-surface) md:flex">
        <div className="flex h-(--psj-header-h) items-center justify-center border-b border-(--psj-line) px-3">
          <Link href="/control" aria-label="RUTABOL-SCZ, ir al resumen">
            <span className="hidden lg:block"><Brand /></span>
            <span className="lg:hidden"><Brand compact /></span>
          </Link>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {groups.map((g, gi) => (
            <div key={g.title} className="flex flex-col gap-1">
              <p className={`psj-side-label px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-(--psj-muted-strong) ${gi ? "pt-4" : "pt-2"}`}>{g.title}</p>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={current?.href === item.href ? "page" : undefined}
                  className="psj-side-link"
                >
                  <item.icon size={20} aria-hidden="true" className="shrink-0" />
                  <span className="psj-side-label truncate">{item.label}</span>
                  <span className="psj-side-label ml-auto"><Count n={item.badge} /></span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="psj-screen-only sticky top-0 z-[1000] flex h-(--psj-header-h) items-center justify-between gap-3 border-b border-(--psj-line) bg-(--psj-surface) px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden"><Brand /></span>
            <p className="hidden truncate text-lg font-semibold md:block">Centro de Control</p>
          </div>
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
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] md:px-6 md:pb-8 print:p-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-(--psj-line) bg-(--psj-surface) md:hidden"
      >
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current?.href === item.href ? "page" : undefined}
            className="psj-bottom-link relative h-(--psj-nav-h)"
          >
            <item.icon size={22} aria-hidden="true" />
            {item.label}
            {!!item.badge && (
              <span className="absolute right-[calc(50%-24px)] top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--psj-danger) px-1 text-[10px] font-bold text-white">
                <span className="sr-only">{item.badge} pendientes</span>
                <span aria-hidden="true">{item.badge}</span>
              </span>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-current={moreActive ? "page" : undefined}
          className="psj-bottom-link h-(--psj-nav-h)"
        >
          <Ellipsis size={22} aria-hidden="true" />
          Más
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="Más secciones">
        <ul className="flex flex-col gap-1">
          {rest.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMore(false)}
                aria-current={isActive(path, item.href) ? "page" : undefined}
                className="psj-side-link"
              >
                <item.icon size={20} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => { setMore(false); goHome(); }} className="psj-side-link w-full text-left">
              <House size={20} aria-hidden="true" />
              Volver al inicio
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
