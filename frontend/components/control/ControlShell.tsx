
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BadgeCheck,
  Banknote,
  Bus,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  FileDown,
  House,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquareWarning,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Sheet } from "@/components/pasajero/ui";
import { useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";

import type { Overview } from "@/components/control/types";

/* =========================================
   TIPOS DE NAVEGACIÓN
========================================= */

interface Item {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  badge?: number;
}

interface Group {
  title: string;
  items: Item[];
}

/* =========================================
   DETECTAR PÁGINA ACTIVA
========================================= */

function isActive(path: string, href: string) {
  return href === "/control"
    ? path === href
    : path === href || path.startsWith(`${href}/`);
}

/* =========================================
   INICIALES DEL ADMINISTRADOR
========================================= */

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

/* =========================================
   IDENTIDAD VISUAL
========================================= */

function Brand({
  compact = false,
  dark = false,
}: {
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">

      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
        dark
          ? "border border-white/10 bg-violet-600"
          : "bg-violet-700"
      }`}>

        <Bus size={23} aria-hidden="true" />

      </span>

      {!compact && (
        <span className="min-w-0">

          <span className={`block whitespace-nowrap text-sm font-extrabold tracking-tight ${
            dark ? "text-white" : "text-violet-950"
          }`}>
            RUTABOL-SCZ
          </span>

          <span className={`mt-1 block whitespace-nowrap text-[10px] font-medium ${
            dark ? "text-violet-200/70" : "text-slate-500"
          }`}>
            Centro de Control
          </span>

        </span>
      )}

    </span>
  );
}

/* =========================================
   AVATAR
========================================= */

function Avatar({
  name,
  dark = false,
  large = false,
}: {
  name: string;
  dark?: boolean;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${
        large ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs"
      } ${
        dark
          ? "border border-white/15 bg-white/10 text-white"
          : "border border-violet-200 bg-violet-50 text-violet-800"
      }`}
    >
      {initials(name)}
    </span>
  );
}

/* =========================================
   CONTADOR DE PENDIENTES
========================================= */

function Count({
  n,
  compact = false,
}: {
  n?: number;
  compact?: boolean;
}) {
  if (!n || n <= 0) return null;

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-red-600 font-bold tabular-nums text-white ${
      compact
        ? "h-[18px] min-w-[18px] px-1 text-[9px]"
        : "h-6 min-w-6 px-2 text-[11px]"
    }`}>
      <span className="sr-only">{n} pendientes</span>

      <span aria-hidden="true">
        {n > 99 ? "99+" : n}
      </span>
    </span>
  );
}

/* =========================================
   ENLACE DEL MENÚ LATERAL
========================================= */

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: Item;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const label = item.badge
    ? `${item.label}, ${item.badge} pendientes`
    : item.label;

  return (
    <Link
      href={item.href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-[46px] w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${
        collapsed
          ? "justify-center"
          : "justify-center xl:justify-start"
      } ${
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-violet-100/75 hover:bg-white/10 hover:text-white"
      }`}
    >

      {/* Indicador de selección */}

      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-violet-300"
        />
      )}

      {/* Icono */}

      <span className="relative flex shrink-0 items-center justify-center">

        <Icon size={21} aria-hidden="true" />

        {!!item.badge && (
          <span
            aria-hidden="true"
            className={`absolute -right-3 -top-2 ${
              collapsed ? "" : "xl:hidden"
            }`}
          >
            <Count n={item.badge} compact />
          </span>
        )}

      </span>

      {/* Etiqueta */}

      {!collapsed && (
        <>

          <span className="hidden min-w-0 flex-1 truncate xl:block">
            {item.label}
          </span>

          {!!item.badge ? (
            <span aria-hidden="true" className="hidden xl:block">
              <Count n={item.badge} />
            </span>
          ) : active ? (
            <ChevronRight
              size={15}
              aria-hidden="true"
              className="hidden shrink-0 xl:block"
            />
          ) : null}

        </>
      )}

    </Link>
  );
}

/* =========================================
   ENLACE DE NAVEGACIÓN MÓVIL
========================================= */

function MobileLink({
  item,
  active,
}: {
  item: Item;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={
        item.badge
          ? `${item.label}, ${item.badge} pendientes`
          : item.label
      }
      aria-current={active ? "page" : undefined}
      className={`relative flex h-(--psj-nav-h) min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold transition-colors ${
        active
          ? "text-violet-700"
          : "text-slate-500"
      }`}
    >

      {active && (
        <span
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-violet-600"
        />
      )}

      <span className={`relative flex h-9 w-11 items-center justify-center rounded-xl ${
        active ? "bg-violet-50" : ""
      }`}>

        <Icon size={22} aria-hidden="true" />

        {!!item.badge && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1"
          >
            <Count n={item.badge} compact />
          </span>
        )}

      </span>

      <span className="max-w-full truncate">
        {item.mobileLabel ?? item.label}
      </span>

    </Link>
  );
}

/* =========================================
   ENLACES DEL MENÚ ADICIONAL
========================================= */

function SheetLink({
  item,
  active,
  onSelect,
}: {
  item: Item;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[58px] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        active
          ? "border-violet-200 bg-violet-50 text-violet-800"
          : "border-transparent text-slate-600 hover:bg-slate-50"
      }`}
    >

      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        active
          ? "bg-violet-700 text-white"
          : "bg-slate-100 text-slate-500"
      }`}>
        <Icon size={21} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-sm font-semibold">
        {item.label}
      </span>

      <Count n={item.badge} />

      <ChevronRight
        size={16}
        aria-hidden="true"
        className="shrink-0 opacity-50"
      />

    </Link>
  );
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */

export default function ControlShell({
  children,
}: {
  children: ReactNode;
}) {
  const { ready, profile, logout } = useApp();

  const router = useRouter();
  const path = usePathname();

  /* Estados de navegación */

  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);

  const menuBox = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const allowed = ready && profile?.role === "control";

  /* =====================================
     CONSULTA DE INDICADORES
  ===================================== */

  const { data } = useFetch<Overview>(
    allowed ? "/control/overview" : null,
    5000
  );

  /* =====================================
     PROTECCIÓN DE RUTAS
  ===================================== */

  useEffect(() => {
    if (ready && profile?.role !== "control") {
      router.replace("/acceso");
    }
  }, [ready, profile, router]);

  /* =====================================
     CIERRE DEL MENÚ DESPLEGABLE
  ===================================== */

  useEffect(() => {
    if (!menu) return;

    function close(event: Event) {
      if (event.type === "keydown") {
        const keyboard = event as KeyboardEvent;

        if (keyboard.key !== "Escape") return;

        setMenu(false);
        menuButton.current?.focus();
        return;
      }

      if (
        event.type === "pointerdown" &&
        menuBox.current?.contains(event.target as Node)
      ) {
        return;
      }

      setMenu(false);
    }

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  /* =====================================
     PANTALLA DE CARGA
  ===================================== */

  if (!allowed || !profile) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-50 p-6">

        <div
          role="status"
          className="flex w-full max-w-sm flex-col items-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm"
        >

          <span className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">

            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-3xl bg-violet-100 opacity-30 motion-reduce:animate-none"
            />

            <ShieldCheck
              size={39}
              aria-hidden="true"
              className="relative"
            />

          </span>

          <LoaderCircle
            size={25}
            aria-hidden="true"
            className="mb-4 animate-spin text-violet-600"
          />

          <h2 className="text-lg font-extrabold text-slate-900">

            {ready
              ? "Redirigiendo..."
              : "Preparando Centro de Control"}

          </h2>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">

            {ready
              ? "Volviendo a la página de acceso."
              : "Estamos verificando tu sesión administrativa."}

          </p>

          <p className="mt-6 text-[10px] font-bold tracking-widest text-violet-700">
            RUTABOL-SCZ
          </p>

        </div>

      </div>
    );
  }

  /* =====================================
     RUTAS ADMINISTRATIVAS ORIGINALES
  ===================================== */

  const groups: Group[] = [
    {
      title: "Operación",
      items: [
        {
          href: "/control",
          label: "Resumen",
          icon: LayoutDashboard,
        },
        {
          href: "/control/acreditaciones",
          label: "Acreditaciones",
          mobileLabel: "Acreditar",
          icon: BadgeCheck,
          badge: data?.kpis.acreditacionesPendientes,
        },
        {
          href: "/control/reclamos",
          label: "Reclamos",
          icon: MessageSquareWarning,
        },
        {
          href: "/control/incidentes",
          label: "Incidentes",
          icon: TriangleAlert,
        },
      ],
    },
    {
      title: "Red de transporte",
      items: [
        {
          href: "/control/flota",
          label: "Micro",
          icon: Bus,
        },
        {
          href: "/control/paradas",
          label: "Paradas",
          icon: MapPin,
        },
        {
          href: "/control/instituciones",
          label: "Instituciones",
          icon: School,
        },
        {
          href: "/control/tarifas",
          label: "Tarifas",
          icon: Banknote,
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          href: "/control/usuarios",
          label: "Usuarios",
          icon: Users,
        },
        {
          href: "/control/auditoria",
          label: "Auditoría",
          icon: ScrollText,
        },
        {
          href: "/control/reportes",
          label: "Reportes",
          icon: FileDown,
        },
      ],
    },
  ];

  const all = groups.flatMap((group) => group.items);

  const current = all
    .filter((item) => isActive(path, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const currentGroup = groups.find((group) =>
    group.items.some((item) => item.href === current?.href)
  );

  const primary = all.slice(0, 4);
  const rest = all.slice(4);

  const moreActive = rest.some((item) =>
    isActive(path, item.href)
  );

  /* =====================================
     ACCIONES DE NAVEGACIÓN
  ===================================== */

  function goHome() {
    setMenu(false);
    setMore(false);

    logout();
    router.replace("/");
  }

  function toggleSidebar() {
    setCollapsed((previous) => !previous);
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="flex min-h-dvh min-w-0 flex-1 bg-slate-50 print:block print:min-h-0 print:bg-white">

      {/* =================================
          MENÚ LATERAL DE ESCRITORIO
      ================================= */}

      <aside
        aria-label="Menú administrativo"
        className={`psj-screen-only sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-violet-950 bg-linear-to-b from-slate-950 via-violet-950 to-slate-950 text-white transition-[width] duration-300 motion-reduce:transition-none md:flex print:hidden ${
          collapsed
            ? "w-[76px]"
            : "w-[76px] xl:w-[270px]"
        }`}
      >

        {/* Decoración */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"
        />

        {/* =================================
            LOGOTIPO
        ================================= */}

        <div className="relative flex h-(--psj-header-h) shrink-0 items-center justify-center border-b border-white/10 px-3">

          <Link
            href="/control"
            aria-label="RUTABOL-SCZ, ir al resumen"
            className="rounded-xl transition-opacity hover:opacity-80"
          >

            {collapsed ? (
              <Brand compact dark />
            ) : (
              <>
                <span className="hidden xl:block">
                  <Brand dark />
                </span>

                <span className="xl:hidden">
                  <Brand compact dark />
                </span>
              </>
            )}

          </Link>

        </div>

        {/* =================================
            GRUPOS DE NAVEGACIÓN
        ================================= */}

        <nav
          aria-label="Navegación principal"
          className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#6d28d9_transparent]"
        >

          {groups.map((group, index) => (
            <div key={group.title} className="space-y-1.5">

              {index > 0 && (
                <div className="mb-3 border-t border-white/10" />
              )}

              {!collapsed && (
                <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300/65 xl:block">

                  {group.title}

                </p>
              )}

              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={current?.href === item.href}
                  collapsed={collapsed}
                />
              ))}

            </div>
          ))}

        </nav>

        {/* =================================
            INFORMACIÓN DEL ADMINISTRADOR
        ================================= */}

        <div className="relative shrink-0 space-y-3 border-t border-white/10 p-3">

          <div
            title="Cuenta administrativa"
            className={`flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">

              <ShieldCheck size={22} aria-hidden="true" />

            </span>

            {!collapsed && (
              <div className="hidden min-w-0 flex-1 xl:block">

                <p className="truncate text-xs font-bold text-white">
                  Acceso administrativo
                </p>

                <p className="mt-1 text-[10px] text-violet-200/70">
                  Centro de Control
                </p>

              </div>
            )}

          </div>

          {/* Perfil */}

          <div
            title={profile.name}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-1 py-2 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <Avatar name={profile.name} dark />

            {!collapsed && (
              <div className="hidden min-w-0 flex-1 xl:block">

                <p className="truncate text-xs font-bold text-white">
                  {profile.name}
                </p>

                <p className="mt-1 text-[10px] text-violet-200/60">
                  Centro de Control
                </p>

              </div>
            )}

          </div>

          {/* Cierre de sesión */}

          <button
            type="button"
            title="Cerrar sesión"
            aria-label="Cerrar sesión y volver al inicio"
            onClick={goHome}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10 hover:text-red-100 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <LogOut
              size={20}
              aria-hidden="true"
              className="shrink-0"
            />

            {!collapsed && (
              <span className="hidden xl:block">
                Cerrar sesión
              </span>
            )}

          </button>

          {/* Contraer menú */}

          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
            title={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
            className={`hidden min-h-10 w-full items-center gap-3 rounded-xl border border-white/10 px-3 text-xs font-semibold text-violet-200 transition-colors hover:bg-white/10 xl:flex ${
              collapsed ? "justify-center" : ""
            }`}
          >

            {collapsed ? (
              <PanelLeftOpen size={19} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={19} aria-hidden="true" />
                Contraer menú
              </>
            )}

          </button>

          {!collapsed && (
            <p className="hidden pt-1 text-center text-[10px] text-violet-200/40 xl:block">
              © RUTABOL-SCZ
            </p>
          )}

        </div>

      </aside>

      {/* =================================
          CONTENEDOR PRINCIPAL
      ================================= */}

      <div className="flex min-w-0 flex-1 flex-col print:block">

        {/* =================================
            ENCABEZADO SUPERIOR
        ================================= */}

        <header className="psj-screen-only sticky top-0 z-[1000] flex h-(--psj-header-h) shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5 xl:px-7 print:hidden">

          {/* Marca y título */}

          <div className="flex min-w-0 flex-1 items-center gap-3">

            {/* Logotipo móvil */}

            <Link
              href="/control"
              aria-label="Ir al resumen administrativo"
              className="min-w-0 md:hidden"
            >

              <span className="min-[380px]:hidden">
                <Brand compact />
              </span>

              <span className="hidden min-[380px]:block">
                <Brand />
              </span>

            </Link>

            {/* Control del menú lateral */}

            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!collapsed}
              aria-label={
                collapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
              }
              title={
                collapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
              }
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 xl:flex"
            >

              {collapsed ? (
                <PanelLeftOpen size={20} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={20} aria-hidden="true" />
              )}

            </button>

            {/* Título dinámico */}

            <div className="hidden min-w-0 md:block">

              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">

                <span>Centro de Control</span>

                <ChevronRight
                  size={11}
                  aria-hidden="true"
                  className="text-slate-400"
                />

                <span className="truncate text-violet-700">

                  {currentGroup?.title ?? "Administración"}

                </span>

              </div>

              <p className="truncate text-base font-extrabold tracking-tight text-slate-900 lg:text-lg">

                {current?.label ?? "Centro de Control"}

              </p>

            </div>

          </div>

          {/* =================================
              ACCIONES DEL ENCABEZADO
          ================================= */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Indicador de acreditaciones */}

            {!!data?.kpis.acreditacionesPendientes && (
              <Link
                href="/control/acreditaciones"
                title="Acreditaciones pendientes"
                aria-label={`${data.kpis.acreditacionesPendientes} acreditaciones pendientes`}
                className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 sm:flex"
              >

                <BadgeCheck size={21} aria-hidden="true" />

                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5"
                >
                  <Count
                    n={data.kpis.acreditacionesPendientes}
                    compact
                  />
                </span>

              </Link>
            )}

            {/* Rol de usuario */}

            <span className="hidden items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-700 lg:flex">

              <ShieldCheck size={16} aria-hidden="true" />

              Administración

            </span>

            <span
              aria-hidden="true"
              className="hidden h-8 w-px bg-slate-200 lg:block"
            />

            {/* =================================
                MENÚ DEL ADMINISTRADOR
            ================================= */}

            <div ref={menuBox} className="relative">

              <button
                ref={menuButton}
                type="button"
                aria-label="Menú de usuario"
                aria-expanded={menu}
                onClick={() => setMenu((previous) => !previous)}
                className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-50"
              >

                <Avatar name={profile.name} />

                <span className="hidden max-w-[150px] min-w-0 xl:block">

                  <span className="block truncate text-xs font-bold text-slate-800">

                    {profile.name}

                  </span>

                  <span className="mt-1 block text-[10px] text-slate-500">
                    Centro de Control
                  </span>

                </span>

                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`hidden shrink-0 text-slate-400 transition-transform xl:block ${
                    menu ? "rotate-180" : ""
                  }`}
                />

              </button>

              {/* =================================
                  MENÚ DESPLEGABLE
              ================================= */}

              {menu && (
                <div className="animate-fade-in absolute right-0 top-[calc(100%+12px)] z-[1100] w-[290px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                  {/* Información del usuario */}

                  <div className="border-b border-slate-100 bg-slate-50 p-4">

                    <div className="flex items-center gap-3">

                      <Avatar name={profile.name} large />

                      <div className="min-w-0 flex-1">

                        <p className="break-words text-sm font-extrabold text-slate-900">
                          {profile.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Cuenta administrativa
                        </p>

                      </div>

                      <ShieldCheck
                        size={21}
                        aria-hidden="true"
                        className="shrink-0 text-violet-600"
                      />

                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs font-semibold text-violet-800">

                      <ShieldCheck size={17} aria-hidden="true" />

                      Rol: Centro de Control

                    </div>

                  </div>

                  {/* Accesos rápidos */}

                  <div className="space-y-1 p-2">

                    <Link
                      href="/control"
                      onClick={() => setMenu(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >

                      <LayoutDashboard size={19} aria-hidden="true" />

                      <span className="flex-1">
                        Resumen administrativo
                      </span>

                      <ChevronRight size={15} aria-hidden="true" />

                    </Link>

                    <Link
                      href="/control/acreditaciones"
                      onClick={() => setMenu(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >

                      <BadgeCheck size={19} aria-hidden="true" />

                      <span className="flex-1">
                        Acreditaciones
                      </span>

                      <Count n={data?.kpis.acreditacionesPendientes} />

                    </Link>

                    <Link
                      href="/control/reportes"
                      onClick={() => setMenu(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >

                      <FileDown size={19} aria-hidden="true" />

                      <span className="flex-1">
                        Reportes del sistema
                      </span>

                      <ChevronRight size={15} aria-hidden="true" />

                    </Link>

                  </div>

                  {/* Cerrar sesión */}

                  <div className="border-t border-slate-100 p-2">

                    <button
                      type="button"
                      onClick={goHome}
                      aria-label="Cerrar sesión y volver al inicio"
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                    >

                      <LogOut size={19} aria-hidden="true" />

                      Cerrar sesión

                    </button>

                    <p className="flex items-center gap-1.5 px-3 pb-2 pt-1 text-[10px] text-slate-400">

                      <House size={13} aria-hidden="true" />

                      Volver a la página principal.

                    </p>

                  </div>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* =================================
            CONTENIDO DE LA PÁGINA
        ================================= */}

        <main className="mx-auto w-full min-w-0 max-w-[1800px] flex-1 px-4 py-5 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] sm:px-5 md:px-6 md:pb-8 xl:px-8 xl:py-8 print:m-0 print:block print:w-full print:max-w-none print:p-0">

          {children}

        </main>

      </div>

      {/* =================================
          NAVEGACIÓN INFERIOR MÓVIL
      ================================= */}

      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav psj-screen-only fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-slate-200 bg-white shadow-[0_-5px_24px_rgb(15_23_42/0.08)] md:hidden print:hidden"
      >

        {primary.map((item) => (
          <MobileLink
            key={item.href}
            item={item}
            active={current?.href === item.href}
          />
        ))}

        {/* Más secciones */}

        <button
          type="button"
          onClick={() => {
            setMenu(false);
            setMore(true);
          }}
          aria-expanded={more}
          aria-label="Mostrar más secciones"
          className={`relative flex h-(--psj-nav-h) min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
            moreActive || more
              ? "text-violet-700"
              : "text-slate-500"
          }`}
        >

          {(moreActive || more) && (
            <span
              aria-hidden="true"
              className="absolute top-0 h-0.5 w-8 rounded-full bg-violet-600"
            />
          )}

          <span className={`flex h-9 w-11 items-center justify-center rounded-xl ${
            moreActive || more ? "bg-violet-50" : ""
          }`}>

            <Ellipsis size={23} aria-hidden="true" />

          </span>

          Más

        </button>

      </nav>

      {/* =================================
          MENÚ ADICIONAL PARA CELULARES
      ================================= */}

      <div className="print:hidden">

        <Sheet
          open={more}
          onClose={() => setMore(false)}
          title="Más secciones"
        >

          <div className="space-y-5">

            {/* Información institucional */}

            <div className="flex items-center gap-3 rounded-2xl bg-linear-to-br from-violet-950 to-violet-700 p-4 text-white">

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">

                <ShieldCheck size={25} aria-hidden="true" />

              </span>

              <div className="min-w-0">

                <p className="text-sm font-bold">
                  Centro de Control
                </p>

                <p className="mt-1 text-xs text-violet-200">
                  Herramientas administrativas
                </p>

              </div>

            </div>

            {/* Opciones adicionales agrupadas */}

            {groups.slice(1).map((group) => (
              <section key={group.title}>

                <h3 className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-widest text-violet-600">

                  {group.title}

                </h3>

                <ul className="space-y-1">

                  {group.items.map((item) => (
                    <li key={item.href}>

                      <SheetLink
                        item={item}
                        active={isActive(path, item.href)}
                        onSelect={() => setMore(false)}
                      />

                    </li>
                  ))}

                </ul>

              </section>
            ))}

            {/* Cierre de sesión */}

            <div className="border-t border-slate-200 pt-4">

              <button
                type="button"
                onClick={goHome}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-red-50 px-4 text-left text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
              >

                <LogOut size={21} aria-hidden="true" />

                Cerrar sesión

              </button>

              <p className="mt-3 text-center text-[10px] text-slate-400">
                RUTABOL-SCZ · Centro de Control
              </p>

            </div>

          </div>

        </Sheet>

      </div>

    </div>
  );
}
