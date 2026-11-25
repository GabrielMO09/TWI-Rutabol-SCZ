
"use client";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  ArrowUpRight,
  Bus,
  ChevronRight,
  CircleHelp,
  Clock3,
  Home,
  LayoutDashboard,
  LogIn,
  Mail,
  Map,
  MapPin,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

import { Logo } from "@/components/AppShell";
import { useApp } from "@/lib/store";

/* =========================================
   RUTAS SEGUN TIPO DE USUARIO
========================================= */

const HOME: Record<string, string> = {
  pasajero: "/pasajero",
  chofer: "/chofer",
  control: "/control",
};

/* =========================================
   PROPIEDADES DEL COMPONENTE
========================================= */

interface PublicShellProps {
  children: ReactNode;
  wide?: boolean;
  backHome?: boolean;
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */

export default function PublicShell({
  children,
  wide = false,
  backHome = false,
}: PublicShellProps) {
  const { profile, logout } = useApp();

  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const panelHref = profile
    ? HOME[profile.role] ?? "/"
    : "/acceso";

  /* =====================================
     CERRAR MENU AL CAMBIAR DE PAGINA
  ===================================== */

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* =====================================
     CERRAR MENU CON LA TECLA ESCAPE
  ===================================== */

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [mobileOpen]);

  /* =====================================
     VERIFICAR RUTA ACTIVA
  ===================================== */

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  /* =====================================
     VOLVER AL INICIO
  ===================================== */

  const handleBackHome = () => {
    setMobileOpen(false);

    if (profile) {
      logout();
    }

    router.replace("/");
  };

  /* =====================================
     ENLACES PRINCIPALES
  ===================================== */

  const navigation = [
    {
      name: "Inicio",
      href: "/",
      icon: Home,
    },
    {
      name: "Rutas y mapa",
      href: "/mapa",
      icon: Map,
    },
    {
      name: "Ayuda",
      href: "/#ayuda",
      icon: CircleHelp,
    },
  ];

  /* =====================================
     ESTRUCTURA GENERAL
  ===================================== */

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">

      {/* =================================
          BARRA SUPERIOR INFORMATIVA
      ================================= */}

      <div className="hidden bg-emerald-950 text-emerald-100 lg:block">
        <div className="mx-auto flex min-h-8 w-full max-w-[1600px] items-center justify-between gap-4 px-6 xl:px-10">

          <div className="flex items-center gap-2 text-[11px] font-medium">
            <MapPin
              size={13}
              className="text-emerald-400"
              aria-hidden="true"
            />

            Santa Cruz de la Sierra, Bolivia
          </div>

          <div className="flex items-center gap-5 text-[11px]">

            <span className="flex items-center gap-1.5">
              <Bus
                size={13}
                className="text-emerald-400"
                aria-hidden="true"
              />

              Plataforma de movilidad urbana
            </span>

            <span className="h-3 w-px bg-white/20" />

            <span className="flex items-center gap-1.5">
              <ShieldCheck
                size={13}
                className="text-emerald-400"
                aria-hidden="true"
              />

              Transporte digital
            </span>
          </div>
        </div>
      </div>

      {/* =================================
          ENCABEZADO PRINCIPAL
      ================================= */}

      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">

        <div className="mx-auto flex h-[70px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[76px] xl:px-10">

          {/* LOGOTIPO */}

          <Link
            href="/"
            aria-label="RUTABOL-SCZ, página de inicio"
            onClick={() => setMobileOpen(false)}
            className="flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-80"
          >
            <Logo />
          </Link>

          {/* =================================
              NAVEGACION DE ESCRITORIO
          ================================= */}

          <nav
            aria-label="Navegación principal"
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          >
            {navigation.map(
              ({ name, href, icon: Icon }) => {
                const active = isActive(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-emerald-800"
                    }`}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className={
                        active
                          ? "text-emerald-600"
                          : "text-slate-500 transition-colors group-hover:text-emerald-600"
                      }
                    />

                    {name}

                    {active && (
                      <span className="absolute inset-x-4 -bottom-[17px] h-[3px] rounded-t-full bg-emerald-600" />
                    )}
                  </Link>
                );
              }
            )}
          </nav>

          {/* =================================
              ACCIONES DE ESCRITORIO
          ================================= */}

          <div className="hidden shrink-0 items-center gap-2 lg:flex">

            {profile ? (
              <Link
                href={panelHref}
                className="btn btn-primary min-h-11 gap-2 rounded-xl px-5"
              >
                <LayoutDashboard size={18} />

                Mi panel

                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/acceso"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <LogIn size={18} />

                  Iniciar sesión
                </Link>

                <Link
                  href="/registro"
                  className="btn btn-primary min-h-11 gap-2 rounded-xl px-5"
                >
                  <UserPlus size={18} />

                  Registrarse
                </Link>
              </>
            )}

            {backHome && (
              profile ? (
                <button
                  type="button"
                  onClick={handleBackHome}
                  className="btn btn-outline min-h-11 gap-2"
                  aria-label="Cerrar sesión y volver al inicio"
                >
                  <Home size={18} />

                  <span className="hidden xl:inline">
                    Volver al inicio
                  </span>
                </button>
              ) : (
                <Link
                  href="/"
                  className="btn btn-outline min-h-11 gap-2"
                  aria-label="Volver al inicio"
                >
                  <Home size={18} />

                  <span className="hidden xl:inline">
                    Volver al inicio
                  </span>
                </Link>
              )
            )}
          </div>

          {/* =================================
              ACCIONES PARA CELULARES
          ================================= */}

          <div className="flex items-center gap-2 lg:hidden">

            {profile ? (
              <Link
                href={panelHref}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
              >
                <LayoutDashboard size={18} />

                <span className="hidden sm:inline">
                  Mi panel
                </span>
              </Link>
            ) : (
              <Link
                href="/acceso"
                aria-label="Iniciar sesión"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50"
              >
                <LogIn size={18} />

                <span className="hidden sm:inline">
                  Ingresar
                </span>
              </Link>
            )}

            {/* BOTON DEL MENU */}

            <button
              type="button"
              aria-label={
                mobileOpen
                  ? "Cerrar menú"
                  : "Abrir menú"
              }
              aria-expanded={mobileOpen}
              aria-controls="rutabol-mobile-menu"
              onClick={() =>
                setMobileOpen((previous) => !previous)
              }
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                mobileOpen
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {mobileOpen ? (
                <X size={23} />
              ) : (
                <Menu size={23} />
              )}
            </button>
          </div>
        </div>

        {/* =================================
            MENU DESPLEGABLE RESPONSIVE
        ================================= */}

        {mobileOpen && (
          <div
            id="rutabol-mobile-menu"
            className="animate-fade-in max-h-[calc(100dvh-70px)] overflow-y-auto border-t border-slate-100 bg-white shadow-xl lg:hidden"
          >
            <nav
              aria-label="Navegación móvil"
              className="mx-auto max-w-3xl space-y-2 px-4 py-5 sm:px-6"
            >
              <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Navegación
              </p>

              {navigation.map(
                ({ name, href, icon: Icon }) => {
                  const active = isActive(href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={
                        active ? "page" : undefined
                      }
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={19} />
                      </span>

                      <span className="flex-1">
                        {name}
                      </span>

                      <ChevronRight
                        size={17}
                        className="text-slate-400"
                      />
                    </Link>
                  );
                }
              )}

              {/* ACCIONES DEL USUARIO */}

              <div className="mt-4 space-y-3 border-t border-slate-100 pt-5">

                <p className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Mi cuenta
                </p>

                {profile ? (
                  <Link
                    href={panelHref}
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-primary w-full justify-center"
                  >
                    <LayoutDashboard size={19} />

                    Ir a mi panel

                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      href="/acceso"
                      onClick={() => setMobileOpen(false)}
                      className="btn btn-outline w-full"
                    >
                      <LogIn size={19} />

                      Iniciar sesión
                    </Link>

                    <Link
                      href="/registro"
                      onClick={() => setMobileOpen(false)}
                      className="btn btn-primary w-full"
                    >
                      <UserPlus size={19} />

                      Crear una cuenta
                    </Link>
                  </div>
                )}

                {backHome && (
                  profile ? (
                    <button
                      type="button"
                      onClick={handleBackHome}
                      className="btn btn-outline w-full"
                    >
                      <Home size={18} />

                      Volver al inicio
                    </button>
                  ) : (
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="btn btn-outline w-full"
                    >
                      <Home size={18} />

                      Volver al inicio
                    </Link>
                  )
                )}
              </div>

              {/* INFORMACION INFERIOR */}

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                <MapPin
                  size={18}
                  className="shrink-0 text-emerald-600"
                />

                Santa Cruz de la Sierra, Bolivia
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* =================================
          CONTENIDO PRINCIPAL
      ================================= */}

      <main
        id="main-content"
        className={`mx-auto w-full flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:py-8 xl:px-10 ${
          wide
            ? "max-w-[1600px]"
            : "max-w-4xl"
        }`}
      >
        {children}
      </main>

      {/* =================================
          PIE DE PAGINA
      ================================= */}

      <footer className="relative isolate overflow-hidden bg-emerald-950 text-white">

        {/* DECORACIONES DE FONDO */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-48 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-10">

          {/* =================================
              CONTENIDO SUPERIOR DEL FOOTER
          ================================= */}

          <div className="grid gap-9 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr] lg:gap-12 lg:py-14">

            {/* IDENTIDAD DE MARCA */}

            <div>
              <Link
                href="/"
                aria-label="RUTABOL-SCZ, página principal"
                className="inline-flex items-center gap-3 rounded-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-emerald-500/20 text-emerald-300">
                  <Bus size={26} />
                </span>

                <div>
                  <p className="text-lg font-extrabold tracking-tight text-white">
                    RUTABOL-SCZ
                  </p>

                  <p className="text-[11px] font-medium tracking-wide text-emerald-200/80">
                    Movilidad urbana inteligente
                  </p>
                </div>
              </Link>

              <p className="mt-5 max-w-sm text-sm leading-relaxed text-emerald-100/70">
                Una plataforma diseñada para mejorar el
                transporte público de Santa Cruz de la Sierra.
                Consulta rutas, conoce tu tarifa y viaja
                utilizando herramientas digitales.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-emerald-200">
                <ShieldCheck size={15} />

                Plataforma de movilidad
              </div>
            </div>

            {/* ENLACES DE PLATAFORMA */}

            <nav aria-label="Plataforma">
              <h2 className="mb-4 text-sm font-bold text-white">
                Plataforma
              </h2>

              <div className="flex flex-col gap-1">

                {[
                  {
                    text: "Inicio",
                    href: "/",
                  },
                  {
                    text: "Rutas y mapa",
                    href: "/mapa",
                  },
                  {
                    text: "Tarifas",
                    href: "/#tarifas",
                  },
                  {
                    text: "Credicard",
                    href: "/#credicard",
                  },
                  {
                    text: "Preguntas frecuentes",
                    href: "/#ayuda",
                  },
                ].map(({ text, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-9 items-center gap-2 text-sm text-emerald-100/70 transition-colors hover:text-white"
                  >
                    <ChevronRight
                      size={14}
                      className="text-emerald-400/70 transition-transform group-hover:translate-x-1"
                    />

                    {text}
                  </Link>
                ))}
              </div>
            </nav>

            {/* ACCESO Y CUENTA */}

            <nav aria-label="Acceso al sistema">

              <h2 className="mb-4 text-sm font-bold text-white">
                Acceso al sistema
              </h2>

              <div className="flex flex-col gap-1">
                {profile && (
                  <Link
                    href={panelHref}
                    className="group flex min-h-9 items-center gap-2 text-sm text-emerald-100/70 transition-colors hover:text-white"
                  >
                    <ChevronRight
                      size={14}
                      className="text-emerald-400/70 transition-transform group-hover:translate-x-1"
                    />

                    Mi panel
                  </Link>
                )}

                {[
                  {
                    text: "Iniciar sesión",
                    href: "/acceso",
                  },
                  {
                    text: "Crear una cuenta",
                    href: "/registro",
                  },
                  {
                    text: "Acceso de chofer",
                    href: "/acceso/chofer",
                  },
                  {
                    text: "Centro de Control",
                    href: "/acceso/control",
                  },
                ].map(({ text, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-9 items-center gap-2 text-sm text-emerald-100/70 transition-colors hover:text-white"
                  >
                    <ChevronRight
                      size={14}
                      className="text-emerald-400/70 transition-transform group-hover:translate-x-1"
                    />

                    {text}
                  </Link>
                ))}
              </div>
            </nav>

            {/* INFORMACION Y CONTACTO */}

            <div>
              <h2 className="mb-4 text-sm font-bold text-white">
                Información y contacto
              </h2>

              <div className="space-y-4">

                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
                    <MapPin size={17} />
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      Ubicación
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-emerald-100/65">
                      Santa Cruz de la Sierra, Bolivia
                    </p>
                  </div>
                </div>

                <a
                  href="mailto:contacto@rutabol.bo"
                  className="group flex items-start gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
                    <Mail size={17} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Correo de contacto
                    </p>

                    <p className="mt-1 break-all text-xs text-emerald-100/65 transition-colors group-hover:text-white">
                      contacto@rutabol.bo
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
                    <Clock3 size={17} />
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      Plataforma digital
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-emerald-100/65">
                      Consulta de rutas y servicios en línea.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================
              ENLACES LEGALES
          ================================= */}

          <div className="flex flex-col gap-5 border-t border-white/10 py-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-medium text-emerald-100/80">
                © RUTABOL-SCZ. Todos los derechos reservados.
              </p>

              <p className="mt-1 text-[11px] text-emerald-100/50">
                Plataforma de transporte público urbano.
              </p>
            </div>

            <nav
              aria-label="Información legal"
              className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs"
            >
              <Link
                href="/terminos"
                className="text-emerald-100/70 transition-colors hover:text-white hover:underline"
              >
                Términos y condiciones
              </Link>

              <Link
                href="/privacidad"
                className="text-emerald-100/70 transition-colors hover:text-white hover:underline"
              >
                Política de privacidad
              </Link>

              <Link
                href="/#ayuda"
                className="flex items-center gap-1.5 text-emerald-100/70 transition-colors hover:text-white"
              >
                Centro de ayuda

                <ArrowUpRight size={13} />
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
