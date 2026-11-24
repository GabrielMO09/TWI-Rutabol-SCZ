"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck, Bus, CreditCard, Ellipsis, History, House, IdCard, Map, MessageSquareWarning,
  PanelLeftClose, PanelLeftOpen, Receipt, UserRound, Wallet,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, StatusPill, type Tone } from "@/components/pasajero/ui";
import { useApp } from "@/lib/store";

interface Item {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

const MAP: Item = { href: "/pasajero", label: "Mapa", title: "Explorar mapa", icon: Map };
const WALLET: Item = { href: "/pasajero/credicard", label: "Credicard", title: "Credicard", icon: CreditCard };
const PAY: Item = { href: "/pasajero/pago", label: "Pagar pasaje", title: "Pagar pasaje", icon: Receipt };
const HISTORY: Item = { href: "/pasajero/historial", label: "Historial de viajes", title: "Historial de viajes", icon: History };
const CARD: Item = { href: "/pasajero/carnet", label: "Carnet digital", title: "Carnet digital", icon: IdCard };
const ACCRED: Item = { href: "/pasajero/acreditacion", label: "Acreditación estudiantil", title: "Acreditación estudiantil", icon: BadgeCheck };
const CLAIMS: Item = { href: "/pasajero/reclamos", label: "Reclamos", title: "Reclamos", icon: MessageSquareWarning };
const PROFILE: Item = { href: "/pasajero/perfil", label: "Configuración del perfil", title: "Perfil y configuración", icon: UserRound };

const isActive = (path: string, href: string) => (href === "/pasajero" ? path === href : path.startsWith(href));

const ACC_PILL: Record<string, { tone: Tone; label: string }> = {
  pendiente: { tone: "warn", label: "Acreditación pendiente" },
  aprobada: { tone: "success", label: "Estudiante acreditado" },
  observada: { tone: "warn", label: "Acreditación observada" },
  rechazada: { tone: "danger", label: "Acreditación rechazada" },
  vencida: { tone: "danger", label: "Acreditación vencida" },
  revocada: { tone: "danger", label: "Acreditación revocada" },
};

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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export default function PasajeroShell({ children }: { children: ReactNode }) {
  const { ready, profile, logout } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuBox = useRef<HTMLDivElement>(null);
  const allowed = ready && profile?.role === "pasajero";

  useEffect(() => {
    if (ready && profile?.role !== "pasajero") router.replace("/acceso");
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

  const student = profile!.category !== "general";
  const transport = [MAP, WALLET, PAY, HISTORY];
  const account = [CARD, ...(student ? [ACCRED] : []), CLAIMS, PROFILE];
  const all = [...transport, ...account];
  const current = all.filter((i) => isActive(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const isMap = path === "/pasajero";
  const acc = student ? ACC_PILL[profile!.accreditation?.status ?? ""] : undefined;
  const moreItems = [HISTORY, ...(student ? [ACCRED] : []), CLAIMS, PROFILE];
  const moreActive = moreItems.some((i) => isActive(path, i.href));

  function goHome() {
    logout();
    router.replace("/");
  }

  const link = (item: Item) => (
    <Link
      key={item.href}
      href={item.href}
      title={item.label}
      aria-current={current?.href === item.href ? "page" : undefined}
      className="psj-side-link"
    >
      <item.icon size={20} aria-hidden="true" className="shrink-0" />
      <span className="psj-side-label truncate">{item.label}</span>
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Escritorio y tablet: menú lateral (compacto en tablet, contraíble en escritorio). */}
      <aside
        className="psj-side sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-(--psj-line) bg-(--psj-surface) md:flex"
        data-collapsed={collapsed}
      >
        <div className="flex h-(--psj-header-h) items-center justify-center border-b border-(--psj-line) px-3">
          <Link href="/pasajero" aria-label="RUTABOL-SCZ, ir al mapa">
            {collapsed ? <Brand compact /> : (
              <>
                <span className="hidden lg:block"><Brand /></span>
                <span className="lg:hidden"><Brand compact /></span>
              </>
            )}
          </Link>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="psj-side-label px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-(--psj-muted-strong)">Transporte</p>
          {transport.map(link)}
          <p className="psj-side-label px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-(--psj-muted-strong)">Mi cuenta</p>
          {account.map(link)}
        </nav>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="psj-icon-btn m-3 hidden self-end lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1000] flex h-(--psj-header-h) items-center justify-between gap-3 border-b border-(--psj-line) bg-(--psj-surface) px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden"><Brand /></span>
            <p className="hidden truncate text-lg font-semibold md:block">{current?.title ?? "Mi cuenta"}</p>
          </div>
          <div className="flex items-center gap-2">
            {acc && (
              <Link href={ACCRED.href} className="hidden sm:inline-flex" aria-label={`${acc.label}. Ver acreditación`}>
                <StatusPill tone={acc.tone}>{acc.label}</StatusPill>
              </Link>
            )}
            <NotificationBell />
            <div ref={menuBox} className="relative">
              <button
                type="button"
                aria-label="Menú de usuario"
                aria-expanded={menu}
                onClick={() => setMenu((o) => !o)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-(--psj-green-soft) text-sm font-semibold text-(--psj-green-dark) transition-colors hover:bg-[#d8ecdf]"
              >
                {profile!.photo ? (
                  // Foto del propio usuario en data URL: next/image no aporta aquí.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile!.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(profile!.name)
                )}
              </button>
              {menu && (
                <div className="psj-card psj-card-shadow absolute right-0 top-12 z-[1100] w-60 p-2">
                  <p className="truncate px-3 py-2 text-sm font-semibold">{profile!.name}</p>
                  <Link href={PROFILE.href} onClick={() => setMenu(false)} className="psj-side-link">
                    <UserRound size={18} aria-hidden="true" />
                    Mi perfil
                  </Link>
                  <button type="button" onClick={goHome} aria-label="Volver al inicio" className="psj-side-link w-full text-left">
                    <House size={18} aria-hidden="true" />
                    Volver al inicio
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className={
            isMap
              ? "flex-1"
              : "mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] md:px-6 md:pb-8"
          }
        >
          {children}
        </main>
      </div>

      {/* Teléfono: navegación inferior con "Pagar" destacado. */}
      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-(--psj-line) bg-(--psj-surface) md:hidden"
      >
        <Link href={MAP.href} aria-current={isActive(path, MAP.href) ? "page" : undefined} className="psj-bottom-link h-(--psj-nav-h)">
          <Map size={22} aria-hidden="true" />
          Mapa
        </Link>
        <Link href={WALLET.href} aria-current={isActive(path, WALLET.href) ? "page" : undefined} className="psj-bottom-link h-(--psj-nav-h)">
          <Wallet size={22} aria-hidden="true" />
          Billetera
        </Link>
        <Link
          href={PAY.href}
          aria-label="Pagar pasaje"
          aria-current={isActive(path, PAY.href) ? "page" : undefined}
          className="psj-bottom-link h-(--psj-nav-h)"
        >
          <span className="psj-pay-fab" aria-hidden="true"><Receipt size={24} /></span>
          <span className="-mt-0.5">Pagar</span>
        </Link>
        <Link href={CARD.href} aria-current={isActive(path, CARD.href) ? "page" : undefined} className="psj-bottom-link h-(--psj-nav-h)">
          <IdCard size={22} aria-hidden="true" />
          Carnet
        </Link>
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

      <Sheet open={more} onClose={() => setMore(false)} title="Más opciones">
        <ul className="flex flex-col gap-1">
          {moreItems.map((item) => (
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
            <button
              type="button"
              onClick={() => {
                setMore(false);
                goHome();
              }}
              className="psj-side-link w-full text-left"
            >
              <House size={20} aria-hidden="true" />
              Volver al inicio
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
