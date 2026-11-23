"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bus, Home } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useApp, type Role } from "@/lib/store";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Páginas del grupo: se muestran como segunda fila y activan esta pestaña. */
  children?: NavItem[];
}

const isActive = (path: string, href: string) =>
  path === href || (href !== "/pasajero" && href !== "/chofer" && href !== "/control" && path.startsWith(href));

const isGroupActive = (path: string, item: NavItem) =>
  item.children ? item.children.some((c) => isActive(path, c.href)) : isActive(path, item.href);

function Tab({ item: { href, label, icon: Icon, badge }, active, small = false }: { item: NavItem; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium ${small ? "py-2" : "py-2.5"} ${
        active ? "border-brand text-brand-dark" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      <Icon size={16} />
      {label}
      {!!badge && <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{badge}</span>}
    </Link>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <Bus size={18} />
      </span>
      <span className={light ? "text-white" : "text-brand-dark"}>RUTABOL-SCZ</span>
    </span>
  );
}

export default function AppShell({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { ready, profile, logout } = useApp();
  const router = useRouter();
  const path = usePathname();
  const allowed = ready && profile?.role === role;
  const sub = nav.find((n) => isGroupActive(path, n))?.children;

  useEffect(() => {
    if (ready && profile?.role !== role) router.replace("/acceso");
  }, [ready, profile, role, router]);

  if (!allowed) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">Cargando...</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">
              {profile!.name}
              {profile!.line && ` · Línea ${profile!.line} / Interno ${profile!.internal}`}
            </span>
            {role === "pasajero" && <NotificationBell />}
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
          </div>
        </div>
        <nav aria-label="Secciones" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {nav.map((item) => (
            <Tab key={item.href} item={item} active={isGroupActive(path, item)} />
          ))}
        </nav>
        {sub && (
          <nav aria-label="Subsecciones" className="border-t border-line bg-soft">
            <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
              {sub.map((item) => (
                <Tab key={item.href} item={item} active={isActive(path, item.href)} small />
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
