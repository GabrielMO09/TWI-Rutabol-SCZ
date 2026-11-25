
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
  Bus,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Ellipsis,
  History,
  House,
  IdCard,
  LoaderCircle,
  LogOut,
  Map,
  MessageSquareWarning,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";

import {
  Sheet,
  StatusPill,
  type Tone,
} from "@/components/pasajero/ui";

import { useApp } from "@/lib/store";

/* =========================================
   CONFIGURACIÓN DE NAVEGACIÓN
========================================= */

interface Item {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

const MAP: Item = {
  href: "/pasajero",
  label: "Explorar mapa",
  title: "Mapa de transporte",
  icon: Map,
};

const WALLET: Item = {
  href: "/pasajero/credicard",
  label: "Mi Credicard",
  title: "Mi Credicard",
  icon: CreditCard,
};

const PAY: Item = {
  href: "/pasajero/pago",
  label: "Pagar pasaje",
  title: "Pagar pasaje",
  icon: Receipt,
};

const HISTORY: Item = {
  href: "/pasajero/historial",
  label: "Historial de viajes",
  title: "Historial de viajes",
  icon: History,
};

const CARD: Item = {
  href: "/pasajero/carnet",
  label: "Carnet digital",
  title: "Mi carnet digital",
  icon: IdCard,
};

const ACCRED: Item = {
  href: "/pasajero/acreditacion",
  label: "Acreditación estudiantil",
  title: "Acreditación estudiantil",
  icon: BadgeCheck,
};

const CLAIMS: Item = {
  href: "/pasajero/reclamos",
  label: "Reclamos",
  title: "Reclamos y solicitudes",
  icon: MessageSquareWarning,
};

const PROFILE: Item = {
  href: "/pasajero/perfil",
  label: "Configuración",
  title: "Perfil y configuración",
  icon: Settings,
};

/* =========================================
   DETECTAR RUTA ACTIVA
========================================= */

function isActive(path: string, href: string) {
  if (href === "/pasajero") {
    return path === href;
  }

  return (
    path === href ||
    path.startsWith(`${href}/`)
  );
}

/* =========================================
   ESTADOS DE ACREDITACIÓN
========================================= */

const ACC_PILL: Record<
  string,
  { tone: Tone; label: string }
> = {
  pendiente: {
    tone: "warn",
    label: "Acreditación pendiente",
  },

  aprobada: {
    tone: "success",
    label: "Estudiante acreditado",
  },

  observada: {
    tone: "warn",
    label: "Acreditación observada",
  },

  rechazada: {
    tone: "danger",
    label: "Acreditación rechazada",
  },

  vencida: {
    tone: "danger",
    label: "Acreditación vencida",
  },

  revocada: {
    tone: "danger",
    label: "Acreditación revocada",
  },
};

/* =========================================
   ETIQUETAS DE CATEGORÍAS
========================================= */

const CATEGORY_NAMES: Record<string, string> = {
  escolar: "Estudiante escolar",
  universitario: "Estudiante universitario",
  general: "Pasajero general",
};

/* =========================================
   OBTENER INICIALES DEL USUARIO
========================================= */

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join("") || "?"
  );
}

/* =========================================
   LOGOTIPO DE LA PLATAFORMA
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
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
          dark
            ? "border border-white/10 bg-emerald-600 text-white"
            : "bg-emerald-700 text-white"
        }`}
      >

        <Bus size={23} aria-hidden="true" />

      </span>

      {!compact && (
        <span className="min-w-0">

          <span
            className={`block whitespace-nowrap text-sm font-extrabold tracking-tight ${
              dark
                ? "text-white"
                : "text-emerald-950"
            }`}
          >
            RUTABOL-SCZ
          </span>

          <span
            className={`mt-0.5 block whitespace-nowrap text-[10px] font-medium ${
              dark
                ? "text-emerald-200/65"
                : "text-slate-500"
            }`}
          >
            Portal del pasajero
          </span>

        </span>
      )}

    </span>
  );
}

/* =========================================
   AVATAR DEL USUARIO
========================================= */

function Avatar({
  name,
  photo,
  className = "",
}: {
  name: string;
  photo?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 ${className}`}
    >

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}

    </span>
  );
}

/* =========================================
   ENLACES DEL MENÚ LATERAL
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

  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
        collapsed
          ? "justify-center"
          : "justify-center xl:justify-start"
      } ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-emerald-100/75 hover:bg-white/10 hover:text-white"
      }`}
    >

      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-emerald-300"
        />
      )}

      <Icon
        size={20}
        aria-hidden="true"
        className="shrink-0"
      />

      {!collapsed && (
        <>

          <span className="hidden min-w-0 flex-1 truncate xl:block">
            {item.label}
          </span>

          {active && (
            <ChevronRight
              size={15}
              aria-hidden="true"
              className="hidden shrink-0 xl:block"
            />
          )}

        </>
      )}

    </Link>
  );
}

/* =========================================
   ENLACES DEL MENÚ MÓVIL
========================================= */

function MobileLink({
  item,
  label,
  path,
  featured = false,
}: {
  item: Item;
  label: string;
  path: string;
  featured?: boolean;
}) {
  const Icon = item.icon;

  const active = isActive(path, item.href);

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-(--psj-nav-h) min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
        active
          ? "text-emerald-700"
          : "text-slate-500"
      }`}
    >

      {featured ? (
        <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white bg-emerald-700 text-white shadow-lg">

          <Icon size={23} aria-hidden="true" />

        </span>
      ) : (
        <span
          className={`flex h-9 w-11 items-center justify-center rounded-xl ${
            active
              ? "bg-emerald-50 text-emerald-700"
              : ""
          }`}
        >

          <Icon size={21} aria-hidden="true" />

        </span>
      )}

      <span>{label}</span>

      {active && !featured && (
        <span
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-7 rounded-full bg-emerald-600"
        />
      )}

    </Link>
  );
}

/* =========================================
   ESTRUCTURA PRINCIPAL DEL PASAJERO
========================================= */

export default function PasajeroShell({
  children,
}: {
  children: ReactNode;
}) {
  const { ready, profile, logout } = useApp();

  const router = useRouter();

  const path = usePathname();

  /* Estados del menú */

  const [collapsed, setCollapsed] =
    useState(false);

  const [more, setMore] = useState(false);

  const [menu, setMenu] = useState(false);

  const menuBox = useRef<HTMLDivElement>(null);

  const menuButton =
    useRef<HTMLButtonElement>(null);

  const allowed =
    ready && profile?.role === "pasajero";

  /* =====================================
     PROTECCIÓN DE RUTAS
  ===================================== */

  useEffect(() => {
    if (ready && profile?.role !== "pasajero") {
      router.replace("/acceso");
    }
  }, [ready, profile, router]);

  /* =====================================
     CERRAR MENÚ AL HACER CLIC FUERA
  ===================================== */

  useEffect(() => {
    if (!menu) return;

    function close(event: Event) {
      if (event.type === "keydown") {
        if (
          (event as KeyboardEvent).key !==
          "Escape"
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
     ESTADO DE CARGA
  ===================================== */

  if (!allowed || !profile) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-50 p-6">

        <div
          role="status"
          className="flex w-full max-w-xs flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >

          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">

            <Bus size={32} aria-hidden="true" />

          </span>

          <LoaderCircle
            size={25}
            aria-hidden="true"
            className="mb-4 animate-spin text-emerald-600"
          />

          <h2 className="font-bold text-slate-900">
            {ready
              ? "Redirigiendo..."
              : "Preparando tu cuenta"}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">

            {ready
              ? "Volviendo a la página de acceso."
              : "Estamos verificando tu sesión."}

          </p>

        </div>

      </div>
    );
  }

  /* =====================================
     INFORMACIÓN DEL PASAJERO
  ===================================== */

  const student =
    profile.category !== "general";

  const categoryName =
    CATEGORY_NAMES[profile.category ?? ""] ??
    "Pasajero";

  const transport = [
    MAP,
    WALLET,
    PAY,
    HISTORY,
  ];

  const account = [
    CARD,
    ...(student ? [ACCRED] : []),
    CLAIMS,
    PROFILE,
  ];

  const all = [
    ...transport,
    ...account,
  ];

  const current = all
    .filter((item) =>
      isActive(path, item.href)
    )
    .sort(
      (a, b) =>
        b.href.length - a.href.length
    )[0];

  const isMap = path === "/pasajero";

  const acc = student
    ? ACC_PILL[
        profile.accreditation?.status ?? ""
      ]
    : undefined;

  const moreItems = [
    HISTORY,
    ...(student ? [ACCRED] : []),
    CLAIMS,
    PROFILE,
  ];

  const moreActive = moreItems.some((item) =>
    isActive(path, item.href)
  );

  /* =====================================
     CERRAR SESIÓN
  ===================================== */

  function goHome() {
    setMenu(false);

    setMore(false);

    logout();

    router.replace("/");
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
        aria-label="Menú del pasajero"
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-emerald-950 bg-linear-to-b from-emerald-950 via-[#064e3b] to-emerald-950 text-white transition-[width] duration-300 md:flex ${
          collapsed
            ? "w-[76px]"
            : "w-[76px] xl:w-[254px]"
        }`}
      >

        {/* Decoración lateral */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
        />

        {/* =================================
            LOGOTIPO
        ================================= */}

        <div className="relative flex h-(--psj-header-h) shrink-0 items-center justify-center border-b border-white/10 px-3">

          <Link
            href="/pasajero"
            aria-label="RUTABOL-SCZ, ir al mapa"
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
            NAVEGACIÓN PRINCIPAL
        ================================= */}

        <nav
          aria-label="Navegación principal"
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-5"
        >

          {/* Transporte */}

          {!collapsed && (
            <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300/60 xl:block">
              Transporte
            </p>
          )}

          <div className="space-y-1.5">

            {transport.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={
                  current?.href === item.href
                }
                collapsed={collapsed}
              />
            ))}

          </div>

          <div className="my-5 border-t border-white/10" />

          {/* Mi cuenta */}

          {!collapsed && (
            <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300/60 xl:block">
              Mi cuenta
            </p>
          )}

          <div className="space-y-1.5">

            {account.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={
                  current?.href === item.href
                }
                collapsed={collapsed}
              />
            ))}

          </div>

        </nav>

        {/* =================================
            INFORMACIÓN DEL USUARIO
        ================================= */}

        <div className="relative shrink-0 space-y-2 border-t border-white/10 p-3">

          <Link
            href={PROFILE.href}
            title="Mi perfil"
            aria-label="Mi perfil"
            className={`flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <Avatar
              name={profile.name}
              photo={profile.photo}
              className="h-9 w-9"
            />

            {!collapsed && (
              <div className="hidden min-w-0 flex-1 xl:block">

                <p className="truncate text-xs font-bold text-white">
                  {profile.name}
                </p>

                <p className="mt-1 truncate text-[10px] text-emerald-200/65">
                  {categoryName}
                </p>

              </div>
            )}

          </Link>

          {/* Cerrar sesión */}

          <button
            type="button"
            onClick={goHome}
            title="Cerrar sesión"
            aria-label="Cerrar sesión y volver al inicio"
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/10 hover:text-red-100 ${
              collapsed
                ? "justify-center"
                : "justify-center xl:justify-start"
            }`}
          >

            <LogOut
              size={19}
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
            onClick={() =>
              setCollapsed((value) => !value)
            }
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
            className={`hidden min-h-10 w-full items-center gap-3 rounded-xl border border-white/10 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-white/10 xl:flex ${
              collapsed
                ? "justify-center"
                : ""
            }`}
          >

            {collapsed ? (
              <PanelLeftOpen
                size={18}
                aria-hidden="true"
              />
            ) : (
              <>

                <PanelLeftClose
                  size={18}
                  aria-hidden="true"
                />

                Contraer menú

              </>
            )}

          </button>

          {!collapsed && (
            <p className="hidden pt-2 text-center text-[10px] text-emerald-200/40 xl:block">
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

        <header className="sticky top-0 z-[1000] flex h-(--psj-header-h) shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm md:px-5 xl:px-7">

          {/* Marca y título */}

          <div className="flex min-w-0 flex-1 items-center gap-3">

            {/* Marca para celulares */}

            <Link
              href="/pasajero"
              aria-label="Ir al mapa"
              className="min-w-0 md:hidden"
            >
              <Brand />
            </Link>

            {/* Botón de escritorio */}

            <button
              type="button"
              onClick={() =>
                setCollapsed((value) => !value)
              }
              aria-label={
                collapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
              }
              aria-expanded={!collapsed}
              title={
                collapsed
                  ? "Expandir menú"
                  : "Contraer menú"
              }
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 xl:flex"
            >

              {collapsed ? (
                <PanelLeftOpen
                  size={19}
                  aria-hidden="true"
                />
              ) : (
                <PanelLeftClose
                  size={19}
                  aria-hidden="true"
                />
              )}

            </button>

            {/* Título de la página actual */}

            <div className="hidden min-w-0 md:block">

              <p className="truncate text-base font-bold tracking-tight text-slate-900 lg:text-lg">

                {current?.title ?? "Mi cuenta"}

              </p>

              <p className="mt-0.5 text-[10px] font-medium text-slate-500">

                Portal del pasajero

              </p>

            </div>

          </div>

          {/* =================================
              ACCIONES DEL ENCABEZADO
          ================================= */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Estado de acreditación */}

            {acc && (
              <Link
                href={ACCRED.href}
                aria-label={`${acc.label}. Ver acreditación`}
                className="hidden items-center rounded-full transition-opacity hover:opacity-80 lg:inline-flex"
              >

                <StatusPill tone={acc.tone}>
                  {acc.label}
                </StatusPill>

              </Link>
            )}

            {/* Notificaciones originales */}

            <div className="flex items-center">

              <NotificationBell />

            </div>

            <span
              aria-hidden="true"
              className="hidden h-8 w-px bg-slate-200 sm:block"
            />

            {/* =================================
                MENÚ DEL USUARIO
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
                  setMenu((value) => !value)
                }
                className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-50"
              >

                <Avatar
                  name={profile.name}
                  photo={profile.photo}
                  className="border border-emerald-200"
                />

                <span className="hidden max-w-[150px] min-w-0 xl:block">

                  <span className="block truncate text-xs font-bold text-slate-800">

                    {profile.name}

                  </span>

                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">

                    {categoryName}

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
                <div className="animate-fade-in absolute right-0 top-[calc(100%+12px)] z-[1100] w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                  {/* Información del usuario */}

                  <div className="border-b border-slate-100 bg-slate-50 p-4">

                    <div className="flex items-center gap-3">

                      <Avatar
                        name={profile.name}
                        photo={profile.photo}
                        className="h-12 w-12"
                      />

                      <div className="min-w-0">

                        <p className="truncate text-sm font-bold text-slate-900">

                          {profile.name}

                        </p>

                        <p className="mt-1 text-xs text-slate-500">

                          {categoryName}

                        </p>

                      </div>

                    </div>

                    {acc && (
                      <div className="mt-3">

                        <Link
                          href={ACCRED.href}
                          onClick={() =>
                            setMenu(false)
                          }
                        >

                          <StatusPill tone={acc.tone}>

                            {acc.label}

                          </StatusPill>

                        </Link>

                      </div>
                    )}

                  </div>

                  {/* Opciones del usuario */}

                  <div className="space-y-1 p-2">

                    <Link
                      href={PROFILE.href}
                      onClick={() =>
                        setMenu(false)
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                    >

                      <UserRound
                        size={18}
                        aria-hidden="true"
                      />

                      <span className="flex-1">
                        Mi perfil
                      </span>

                      <ChevronRight
                        size={15}
                        aria-hidden="true"
                      />

                    </Link>

                    <Link
                      href={CARD.href}
                      onClick={() =>
                        setMenu(false)
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                    >

                      <IdCard
                        size={18}
                        aria-hidden="true"
                      />

                      <span className="flex-1">
                        Mi carnet digital
                      </span>

                      <ChevronRight
                        size={15}
                        aria-hidden="true"
                      />

                    </Link>

                    <Link
                      href={WALLET.href}
                      onClick={() =>
                        setMenu(false)
                      }
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                    >

                      <Wallet
                        size={18}
                        aria-hidden="true"
                      />

                      <span className="flex-1">
                        Mi Credicard
                      </span>

                      <ChevronRight
                        size={15}
                        aria-hidden="true"
                      />

                    </Link>

                  </div>

                  {/* Cierre de sesión */}

                  <div className="border-t border-slate-100 p-2">

                    <button
                      type="button"
                      onClick={goHome}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >

                      <LogOut
                        size={18}
                        aria-hidden="true"
                      />

                      Cerrar sesión

                    </button>

                    <p className="px-3 pb-2 pt-1 text-[10px] leading-relaxed text-slate-400">

                      Volverás a la página principal.

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

        <main
          className={
            isMap
              ? "flex min-h-0 min-w-0 flex-1 flex-col"
              : "mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 py-6 pb-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom)+24px)] sm:px-6 md:pb-8 xl:px-8 xl:py-8"
          }
        >

          {children}

        </main>

      </div>

      {/* =================================
          NAVEGACIÓN INFERIOR PARA CELULARES
      ================================= */}

      <nav
        aria-label="Navegación inferior"
        className="psj-bottom-nav fixed inset-x-0 bottom-0 z-[1200] flex items-start border-t border-slate-200 bg-white shadow-[0_-5px_24px_rgb(15_23_42/0.08)] md:hidden"
      >

        <MobileLink
          item={MAP}
          label="Mapa"
          path={path}
        />

        <MobileLink
          item={WALLET}
          label="Billetera"
          path={path}
        />

        <MobileLink
          item={PAY}
          label="Pagar"
          path={path}
          featured
        />

        <MobileLink
          item={CARD}
          label="Carnet"
          path={path}
        />

        {/* Más opciones */}

        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label="Más opciones"
          aria-expanded={more}
          aria-current={
            moreActive ? "page" : undefined
          }
          className={`relative flex h-(--psj-nav-h) min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            moreActive
              ? "text-emerald-700"
              : "text-slate-500"
          }`}
        >

          <span
            className={`flex h-9 w-11 items-center justify-center rounded-xl ${
              moreActive
                ? "bg-emerald-50"
                : ""
            }`}
          >

            <Ellipsis
              size={23}
              aria-hidden="true"
            />

          </span>

          Más

          {moreActive && (
            <span className="absolute top-0 h-0.5 w-7 rounded-full bg-emerald-600" />
          )}

        </button>

      </nav>

      {/* =================================
          PANEL DE MÁS OPCIONES
      ================================= */}

      <Sheet
        open={more}
        onClose={() => setMore(false)}
        title="Más opciones"
      >

        <div className="space-y-4">

          {/* Información del pasajero */}

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

            <Avatar
              name={profile.name}
              photo={profile.photo}
              className="h-12 w-12 border-2 border-white"
            />

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-bold text-emerald-950">

                {profile.name}

              </p>

              <p className="mt-1 text-xs text-emerald-700">

                {categoryName}

              </p>

            </div>

            <ShieldCheck
              size={22}
              aria-hidden="true"
              className="shrink-0 text-emerald-600"
            />

          </div>

          {/* Opciones adicionales */}

          <ul className="space-y-2">

            {moreItems.map((item) => {
              const Icon = item.icon;

              const active = isActive(
                path,
                item.href
              );

              return (
                <li key={item.href}>

                  <Link
                    href={item.href}
                    onClick={() =>
                      setMore(false)
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">

                      <Icon
                        size={19}
                        aria-hidden="true"
                      />

                    </span>

                    <span className="flex-1">

                      {item.label}

                    </span>

                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-slate-400"
                    />

                  </Link>

                </li>
              );
            })}

          </ul>

          {/* Cerrar sesión */}

          <button
            type="button"
            onClick={goHome}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
          >

            <LogOut
              size={19}
              aria-hidden="true"
            />

            Cerrar sesión

          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">

            <House
              size={14}
              aria-hidden="true"
            />

            Volver a la página principal.

          </p>

        </div>

      </Sheet>

    </div>
  );
}
