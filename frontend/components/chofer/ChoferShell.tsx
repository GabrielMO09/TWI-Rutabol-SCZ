
"use client";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Bus,
  ChevronDown,
  ChevronRight,
  Gauge,
  House,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  ScanFace,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  StatusPill,
} from "@/components/pasajero/ui";

import { useApp } from "@/lib/store";

/* =========================================
   CONFIGURACIÓN DE NAVEGACIÓN
========================================= */

interface Item {
  href: string;
  label: string;
  mobileLabel: string;
  title: string;
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  {
    href: "/chofer",
    label: "Jornada y aforo",
    mobileLabel: "Jornada",
    title: "Jornada y aforo",
    icon: Gauge,
  },

  {
    href: "/chofer/validacion",
    label: "Validar y cobrar",
    mobileLabel: "Validar",
    title: "Validación de pasajeros",
    icon: ScanFace,
  },

  {
    href: "/chofer/incidentes",
    label: "Incidentes",
    mobileLabel: "Incidentes",
    title: "Gestión de incidentes",
    icon: TriangleAlert,
  },

  {
    href: "/chofer/trasbordo",
    label: "Trasbordos",
    mobileLabel: "Trasbordos",
    title: "Gestión de trasbordos",
    icon: Repeat,
  },
];

/* =========================================
   DETECTAR RUTA ACTIVA
========================================= */

function isActive(
  path: string,
  href: string
) {
  if (href === "/chofer") {
    return path === href;
  }

  return (
    path === href ||
    path.startsWith(`${href}/`)
  );
}

/* =========================================
   INICIALES DEL CONDUCTOR
========================================= */

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase()
      )
      .join("") || "?"
  );
}

/* =========================================
   LOGOTIPO DEL PORTAL
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

      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
          dark
            ? "border border-white/10 bg-blue-600"
            : "bg-blue-700"
        }`}
      >

        <Bus
          size={23}
          aria-hidden="true"
        />

      </span>

      {!compact && (
        <span className="min-w-0">

          <span
            className={`block whitespace-nowrap text-sm font-extrabold tracking-tight ${
              dark
                ? "text-white"
                : "text-blue-950"
            }`}
          >

            RUTABOL-SCZ

          </span>

          <span
            className={`mt-1 block whitespace-nowrap text-[10px] font-medium ${
              dark
                ? "text-blue-200/70"
                : "text-slate-500"
            }`}
          >

            Portal del conductor

          </span>

        </span>
      )}

    </span>
  );
}

/* =========================================
   AVATAR DEL CONDUCTOR
========================================= */

function Avatar({
  name,
  dark = false,
  className = "",
}: {
  name: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
        dark
          ? "border border-white/15 bg-white/10 text-white"
          : "border border-blue-200 bg-blue-50 text-blue-800"
      } ${className}`}
    >

      {initials(name)}

    </span>
  );
}

/* =========================================
   CONTADOR DE VALIDACIONES
========================================= */

function Count({
  n,
  compact = false,
}: {
  n: number;
  compact?: boolean;
}) {
  if (n <= 0) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-red-500 font-bold tabular-nums text-white ${
        compact
          ? "h-[19px] min-w-[19px] px-1 text-[9px]"
          : "h-6 min-w-6 px-1.5 text-[11px]"
      }`}
    >

      {n > 99 ? "99+" : n}

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
  pending,
}: {
  item: Item;
  active: boolean;
  collapsed: boolean;
  pending: number;
}) {
  const Icon = item.icon;

  const label = pending > 0
    ? `${item.label}, ${pending} pendientes`
    : item.label;

  return (
    <Link
      href={item.href}
      title={label}
      aria-label={label}
      aria-current={
        active ? "page" : undefined
      }
      className={`group relative flex min-h-[50px] w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
        collapsed
          ? "justify-center"
          : "justify-center xl:justify-start"
      } ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-blue-100/75 hover:bg-white/10 hover:text-white"
      }`}
    >

      {/* Indicador de página activa */}

      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-blue-300"
        />
      )}

      {/* Icono */}

      <span className="relative flex shrink-0 items-center justify-center">

        <Icon
          size={22}
          aria-hidden="true"
        />

        {/* Contador con menú contraído */}

        {pending > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -right-3 -top-2 ${
              collapsed ? "" : "xl:hidden"
            }`}
          >

            <Count
              n={pending}
              compact
            />

          </span>
        )}

      </span>

      {/* Texto del menú expandido */}

      {!collapsed && (
        <>

          <span className="hidden min-w-0 flex-1 truncate xl:block">

            {item.label}

          </span>

          {pending > 0 ? (
            <span
              aria-hidden="true"
              className="hidden xl:block"
            >

              <Count n={pending} />

            </span>
          ) : active ? (
            <ChevronRight
              size={16}
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
  pending,
}: {
  item: Item;
  active: boolean;
  pending: number;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={
        pending > 0
          ? `${item.label}, ${pending} pendientes`
          : item.label
      }
      aria-current={
        active ? "page" : undefined
      }
      className={`relative flex h-(--psj-nav-h) min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
        active
          ? "text-blue-700"
          : "text-slate-500"
      }`}
    >

      {active && (
        <span
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600"
        />
      )}

      <span
        className={`relative flex h-9 w-12 items-center justify-center rounded-xl ${
          active
            ? "bg-blue-50"
            : ""
        }`}
      >

        <Icon
          size={23}
          aria-hidden="true"
        />

        {pending > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1"
          >

            <Count
              n={pending}
              compact
            />

          </span>
        )}

      </span>

      <span>

        {item.mobileLabel}

      </span>

    </Link>
  );
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */

export default function ChoferShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    ready,
    profile,
    world,
    logout,
  } = useApp();

  const router = useRouter();

  const path = usePathname();

  /* =====================================
     ESTADOS DE LA INTERFAZ
  ===================================== */

  const [collapsed, setCollapsed] =
    useState(false);

  const [menu, setMenu] =
    useState(false);

  const menuBox =
    useRef<HTMLDivElement>(null);

  const menuButton =
    useRef<HTMLButtonElement>(null);

  const allowed =
    ready &&
    profile?.role === "chofer";

  /* =====================================
     PROTECCIÓN DE RUTAS
  ===================================== */

  useEffect(() => {
    if (
      ready &&
      profile?.role !== "chofer"
    ) {
      router.replace("/acceso");
    }
  }, [
    ready,
    profile,
    router,
  ]);

  /* =====================================
     CERRAR MENÚ AL HACER CLIC FUERA
  ===================================== */

  useEffect(() => {
    if (!menu) return;

    function close(event: Event) {
      if (event.type === "keydown") {
        const keyboardEvent =
          event as KeyboardEvent;

        if (
          keyboardEvent.key !== "Escape"
        ) {
          return;
        }

        setMenu(false);

        menuButton.current?.focus();

        return;
      }

      if (
        event.type === "pointerdown" &&
        menuBox.current?.contains(
          event.target as Node
        )
      ) {
        return;
      }

      setMenu(false);
    }

    document.addEventListener(
      "pointerdown",
      close
    );

    document.addEventListener(
      "keydown",
      close
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        close
      );

      document.removeEventListener(
        "keydown",
        close
      );
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

          <span className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">

            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-3xl bg-blue-100 opacity-30"
            />

            <Bus
              size={38}
              aria-hidden="true"
              className="relative"
            />

          </span>

          <LoaderCircle
            size={24}
            aria-hidden="true"
            className="mb-4 animate-spin text-blue-600"
          />

          <h2 className="text-lg font-bold text-slate-900">

            {ready
              ? "Redirigiendo..."
              : "Preparando tu unidad"}

          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">

            {ready
              ? "Volviendo a la página de acceso."
              : "Estamos verificando tu sesión de conductor."}

          </p>

          <p className="mt-6 text-[10px] font-extrabold tracking-widest text-blue-700">

            RUTABOL-SCZ

          </p>

        </div>

      </div>
    );
  }

  /* =====================================
     INFORMACIÓN DEL CONDUCTOR
  ===================================== */

  const bus = world.buses.find(
    (item) =>
      item.id === profile.busId
  );

  const pending = world.reqs.filter(
    (request) =>
      request.busId === profile.busId
  ).length;

  const onDuty =
    world.jornada?.onDuty ??
    bus?.onDuty ??
    false;

  const current = ITEMS.find(
    (item) =>
      isActive(path, item.href)
  );

  function badge(href: string) {
    return href === "/chofer/validacion"
      ? pending
      : 0;
  }

  /* =====================================
     CERRAR SESIÓN
  ===================================== */

  function goHome() {
    setMenu(false);

    logout();

    router.replace("/");
  }

  /* =====================================
     CONTRAER MENÚ LATERAL
  ===================================== */

  function toggleSidebar() {
    setCollapsed(
      (previous) => !previous
    );
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="flex min-h-dvh min-w-0 flex-1 bg-slate-50">

      {/* =================================
          MENÚ LATERAL DE ESCRITORIO
      ================================= */}

      <aside
        aria-label="Menú del conductor"
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-blue-950 bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 text-white transition-[width] duration-300 md:flex ${
          collapsed
            ? "w-[76px]"
            : "w-[76px] xl:w-[260px]"
        }`}
      >

        {/* Decoración lateral */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
        />

        {/* =================================
            LOGOTIPO
        ================================= */}

        <div className="relative flex h-(--psj-header-h) shrink-0 items-center justify-center border-b border-white/10 px-3">

          <Link
            href="/chofer"
            aria-label="RUTABOL-SCZ, ir al panel"
            className="rounded-xl transition-opacity hover:opacity-80"
          >

            {collapsed ? (
              <Brand
                compact
                dark
              />
            ) : (
              <>

                <span className="hidden xl:block">

                  <Brand dark />

                </span>

                <span className="xl:hidden">

                  <Brand
                    compact
                    dark
                  />

                </span>

              </>
            )}

          </Link>

        </div>

        {/* =================================
            NAVEGACIÓN PRINCIPAL
        ================================= */}

        <nav
          aria-label="Navegación principal"
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-5"
        >

          {!collapsed && (
            <div className="mb-4 hidden px-3 xl:block">

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300/60">

                Operaciones

              </p>

            </div>
          )}

          <div className="space-y-2">

            {ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={
                  current?.href === item.href
                }
                collapsed={collapsed}
                pending={badge(item.href)}
              />
            ))}

          </div>

          {/* Información institucional */}

          {!collapsed && (
            <div className="mt-8 hidden rounded-xl border border-white/10 bg-white/5 p-4 xl:block">

              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">

                <ShieldCheck
                  size={20}
                  aria-hidden="true"
                />

              </span>

              <p className="text-xs font-bold text-white">

                Centro de operaciones

              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-blue-200/60">

                Administra tu jornada,
                pasajeros e incidencias
                desde un solo lugar.

              </p>

            </div>
          )}

        </nav>

        {/* =================================
            INFORMACIÓN DE LA UNIDAD
        ================================= */}

        <div className="relative shrink-0 space-y-3 border-t border-white/10 p-3">

          <div
            title={
              bus
                ? `Línea ${bus.line}, interno ${bus.internal}`
                : "Unidad no disponible"
            }
            className={`flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-200">

              <Bus
                size={21}
                aria-hidden="true"
              />

              <span
                aria-hidden="true"
                className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-blue-950 ${
                  onDuty
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />

            </span>

            {!collapsed && (
              <div className="hidden min-w-0 flex-1 xl:block">

                <p className="truncate text-sm font-extrabold text-white">

                  {bus
                    ? `Línea ${bus.line}`
                    : "Sin unidad"}

                </p>

                {bus && (
                  <p className="mt-1 truncate text-[11px] text-blue-200/70">

                    Interno {bus.internal}

                  </p>
                )}

                <p
                  className={`mt-2 text-[10px] font-bold ${
                    onDuty
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }`}
                >

                  {onDuty
                    ? "En servicio"
                    : "Fuera de servicio"}

                </p>

              </div>
            )}

          </div>

          {/* Información del conductor */}

          <div
            title={profile.name}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <Avatar
              name={profile.name}
              dark
              className="h-9 w-9"
            />

            {!collapsed && (
              <div className="hidden min-w-0 flex-1 xl:block">

                <p className="truncate text-xs font-bold text-white">

                  {profile.name}

                </p>

                <p className="mt-1 text-[10px] text-blue-200/60">

                  Conductor

                </p>

              </div>
            )}

          </div>

          {/* Cerrar sesión */}

          <button
            type="button"
            onClick={goHome}
            title="Cerrar sesión"
            aria-label="Cerrar sesión y volver al inicio"
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

          {/* Contraer o expandir */}

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
            aria-expanded={!collapsed}
            title={
              collapsed
                ? "Expandir menú"
                : "Contraer menú"
            }
            className={`hidden min-h-10 w-full items-center gap-3 rounded-xl border border-white/10 px-3 text-xs font-semibold text-blue-200 transition-colors hover:bg-white/10 xl:flex ${
              collapsed
                ? "justify-center"
                : ""
            }`}
          >

            {collapsed ? (
              <PanelLeftOpen
                size={19}
                aria-hidden="true"
              />
            ) : (
              <>

                <PanelLeftClose
                  size={19}
                  aria-hidden="true"
                />

                Contraer menú

              </>
            )}

          </button>

          {!collapsed && (
            <p className="hidden pt-2 text-center text-[10px] text-blue-200/35 xl:block">

              © RUTABOL-SCZ

            </p>
          )}

        </div>

      </aside>

      {/* =================================
          CONTENEDOR PRINCIPAL
      ================================= */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* =================================
            ENCABEZADO SUPERIOR
        ================================= */}

        <header className="sticky top-0 z-[1000] flex h-(--psj-header-h) shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-4 md:px-5 xl:px-7">

          {/* Marca y título */}

          <div className="flex min-w-0 flex-1 items-center gap-3">

            {/* Logotipo móvil */}

            <Link
              href="/chofer"
              aria-label="Ir al panel del conductor"
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
              aria-label={
                collapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
              }
              aria-expanded={!collapsed}
              title={
                collapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
              }
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 xl:flex"
            >

              {collapsed ? (
                <PanelLeftOpen
                  size={20}
                  aria-hidden="true"
                />
              ) : (
                <PanelLeftClose
                  size={20}
                  aria-hidden="true"
                />
              )}

            </button>

            {/* Título dinámico */}

            <div className="hidden min-w-0 md:block">

              <p className="truncate text-base font-extrabold tracking-tight text-slate-900 lg:text-lg">

                {current?.title ??
                  "Panel del conductor"}

              </p>

              <p className="mt-0.5 text-[10px] font-medium text-slate-500">

                Centro de operaciones

              </p>

            </div>

          </div>

          {/* =================================
              ACCIONES DEL ENCABEZADO
          ================================= */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Información de la unidad */}

            {bus && (
              <div className="hidden items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 lg:flex">

                <Bus
                  size={19}
                  aria-hidden="true"
                  className="shrink-0 text-blue-700"
                />

                <div>

                  <p className="text-xs font-bold text-blue-950">

                    Línea {bus.line}

                  </p>

                  <p className="mt-0.5 text-[10px] text-blue-700">

                    Interno {bus.internal}

                  </p>

                </div>

              </div>
            )}

            {/* Estado de la jornada */}

            <span className="hidden sm:inline-flex">

              <StatusPill
                tone={
                  onDuty
                    ? "success"
                    : "warn"
                }
              >

                {onDuty
                  ? "En servicio"
                  : "Fuera de servicio"}

              </StatusPill>

            </span>

            {/* Estado compacto para móviles */}

            <span
              role="status"
              aria-label={
                onDuty
                  ? "En servicio"
                  : "Fuera de servicio"
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold sm:hidden ${
                onDuty
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >

              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  onDuty
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />

              {onDuty
                ? "En servicio"
                : "Sin servicio"}

            </span>

            <span
              aria-hidden="true"
              className="hidden h-8 w-px bg-slate-200 sm:block"
            />

            {/* =================================
                MENÚ DEL CONDUCTOR
            ================================= */}

            <div
              ref={menuBox}
              className="relative"
            >

              <button
                ref={menuButton}
                type="button"
                aria-label="Menú de usuario"
                aria-expanded={menu}
                onClick={() =>
                  setMenu(
                    (previous) => !previous
                  )
                }
                className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-50"
              >

                <Avatar
                  name={profile.name}
                />

                <span className="hidden max-w-[140px] min-w-0 xl:block">

                  <span className="block truncate text-xs font-bold text-slate-800">

                    {profile.name}

                  </span>

                  <span className="mt-1 block text-[10px] text-slate-500">

                    Conductor

                  </span>

                </span>

                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`hidden shrink-0 text-slate-400 transition-transform duration-200 xl:block ${
                    menu ? "rotate-180" : ""
                  }`}
                />

              </button>

              {/* Menú desplegable */}

              {menu && (
                <div className="animate-fade-in absolute right-0 top-[calc(100%+12px)] z-[1100] w-[290px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                  {/* Información personal */}

                  <div className="border-b border-slate-100 bg-slate-50 p-4">

                    <div className="flex items-center gap-3">

                      <Avatar
                        name={profile.name}
                        className="h-12 w-12 text-sm"
                      />

                      <div className="min-w-0 flex-1">

                        <p className="break-words text-sm font-extrabold text-slate-900">

                          {profile.name}

                        </p>

                        <p className="mt-1 text-xs text-slate-500">

                          Cuenta de conductor

                        </p>

                      </div>

                      <UserRound
                        size={19}
                        aria-hidden="true"
                        className="shrink-0 text-blue-600"
                      />

                    </div>

                  </div>

                  {/* Unidad asignada */}

                  {bus && (
                    <div className="border-b border-slate-100 p-3">

                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">

                        <div className="flex items-center gap-3">

                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">

                            <Bus
                              size={22}
                              aria-hidden="true"
                            />

                          </span>

                          <div className="min-w-0 flex-1">

                            <p className="text-xs font-bold text-blue-950">

                              Línea {bus.line}

                            </p>

                            <p className="mt-1 text-[11px] text-blue-700">

                              Interno {bus.internal}

                            </p>

                            {bus.plate && (
                              <p className="mt-1 break-all text-[10px] text-blue-700">

                                Placa: {bus.plate}

                              </p>
                            )}

                          </div>

                        </div>

                        <div className="mt-3">

                          <StatusPill
                            tone={
                              onDuty
                                ? "success"
                                : "warn"
                            }
                          >

                            {onDuty
                              ? "En servicio"
                              : "Fuera de servicio"}

                          </StatusPill>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* Acceso al panel */}

                  <div className="space-y-1 p-2">

                    <Link
                      href="/chofer"
                      onClick={() =>
                        setMenu(false)
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >

                      <Gauge
                        size={19}
                        aria-hidden="true"
                      />

                      <span className="flex-1">

                        Mi panel operativo

                      </span>

                      <ChevronRight
                        size={15}
                        aria-hidden="true"
                      />

                    </Link>

                    <Link
                      href="/chofer/validacion"
                      onClick={() =>
                        setMenu(false)
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >

                      <ScanFace
                        size={19}
                        aria-hidden="true"
                      />

                      <span className="flex-1">

                        Validar pasajeros

                      </span>

                      <Count n={pending} />

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

                      <LogOut
                        size={19}
                        aria-hidden="true"
                      />

                      Cerrar sesión

                    </button>

                    <p className="flex items-center gap-1.5 px-3 pb-2 pt-1 text-[10px] text-slate-400">

                      <House
                        size={13}
                        aria-hidden="true"
                      />

                      Volver a la página principal.

                    </p>

                  </div>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* =================================
            CONTENIDO DE CADA PÁGINA
        ================================= */}

        <main className="mx-auto w-full min-w-0 max-w-[1480px] flex-1 px-4 py-5 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] sm:px-5 md:px-6 md:pb-8 xl:px-8 xl:py-8">

          {children}

        </main>

      </div>

      {/* =================================
          NAVEGACIÓN INFERIOR MÓVIL
      ================================= */}

      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-slate-200 bg-white shadow-[0_-5px_24px_rgb(15_23_42/0.08)] md:hidden"
      >

        {ITEMS.map((item) => (
          <MobileLink
            key={item.href}
            item={item}
            active={
              current?.href === item.href
            }
            pending={badge(item.href)}
          />
        ))}

      </nav>

    </div>
  );
}
