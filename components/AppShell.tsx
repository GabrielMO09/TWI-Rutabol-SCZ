"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bus, LogOut } from "lucide-react";
import { useApp, type Role } from "@/lib/store";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
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
            <button
              className="btn btn-outline h-9"
              onClick={() => {
                logout();
                router.replace("/");
              }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {nav.map(({ href, label, icon: Icon, badge }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
                  active ? "border-brand text-brand-dark" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {label}
                {!!badge && (
                  <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
