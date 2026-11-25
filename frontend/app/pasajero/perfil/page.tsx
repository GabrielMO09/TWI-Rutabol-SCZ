
"use client";

import {
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Fingerprint,
  GraduationCap,
  Info,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MonitorSmartphone,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  TextField,
  PasswordInput,
  SubmitButton,
} from "@/components/auth/fields";

import {
  dateTime,
} from "@/components/pasajero/format";

import {
  ErrorState,
  Notice,
  Skeleton,
  StatusPill,
} from "@/components/pasajero/ui";

import {
  act,
  useFetch,
} from "@/lib/api";

import {
  CATEGORY_LABEL,
} from "@/lib/data";

import {
  useApp,
} from "@/lib/store";

/* =========================================
   TIPOS DE DATOS
========================================= */

interface Session {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  current: boolean;
}

type Section =
  | "datos"
  | "password"
  | "sesiones";

/* =========================================
   CONFIGURACIÓN DEL MENÚ
========================================= */

const SECTIONS: {
  id: Section;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    id: "datos",
    label: "Datos personales",
    hint: "Información de tu cuenta",
    icon: UserRound,
  },
  {
    id: "password",
    label: "Contraseña",
    hint: "Seguridad de acceso",
    icon: KeyRound,
  },
  {
    id: "sesiones",
    label: "Sesiones activas",
    hint: "Administra tus accesos",
    icon: MonitorSmartphone,
  },
];

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors enabled:hover:border-emerald-200 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

const DANGER =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition-colors enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

/* =========================================
   INICIALES DEL USUARIO
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
   CONTENEDOR DE CONFIGURACIÓN
========================================= */

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${CARD} animate-fade-up overflow-hidden`}
    >

      {/* Encabezado */}

      <div className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">

          <Icon
            size={24}
            aria-hidden="true"
          />

        </span>

        <div className="min-w-0">

          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {description}
          </p>

        </div>

      </div>

      {/* Contenido */}

      <div className="p-5 sm:p-6">

        {children}

      </div>

    </section>
  );
}

/* =========================================
   CAMPO DE SOLO LECTURA
========================================= */

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-0">

      <p className="mb-2 text-sm font-semibold text-slate-700">
        {label}
      </p>

      <div className="flex min-h-[52px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

        <Icon
          size={19}
          aria-hidden="true"
          className="shrink-0 text-slate-400"
        />

        <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-600">
          {value}
        </span>

        <LockKeyhole
          size={14}
          aria-hidden="true"
          className="shrink-0 text-slate-400"
        />

      </div>

    </div>
  );
}

/* =========================================
   PÁGINA PRINCIPAL DEL PERFIL
========================================= */

export default function Perfil() {
  const {
    profile,
    reloadProfile,
    logout,
  } = useApp();

  const router = useRouter();

  /* =====================================
     SESIONES ACTIVAS
  ===================================== */

  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
    reload: reloadSessions,
  } = useFetch<Session[]>(
    "/auth/sessions"
  );

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [nameDraft, setNameDraft] =
    useState<string | null>(null);

  const [current, setCurrent] =
    useState("");

  const [next, setNext] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  const [msg, setMsg] =
    useState<string | null>(null);

  const [ok, setOk] =
    useState<string | null>(null);

  const [sec, setSec] =
    useState<Section | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [closingSession, setClosingSession] =
    useState<string | null>(null);

  const [confirmSession, setConfirmSession] =
    useState<string | null>(null);

  const [confirmLogout, setConfirmLogout] =
    useState(false);

  const lock = useRef(false);

  const active = sec ?? "datos";

  /*
   * Si el perfil se actualiza desde el servidor,
   * el nombre se mantiene sincronizado mientras
   * el usuario no esté editándolo.
   */

  const name =
    nameDraft ?? profile?.name ?? "";

  /* =====================================
     CAMBIAR DE SECCIÓN
  ===================================== */

  function pick(section: Section | null) {
    if (lock.current) return;

    setSec(section);

    setMsg(null);

    setOk(null);

    setConfirmSession(null);

    setConfirmLogout(false);

    setCurrent("");

    setNext("");

    setConfirmation("");
  }

  /* =====================================
     EJECUTAR OPERACIONES
  ===================================== */

  async function run(
    action: () => Promise<string | null>,
    success: string,
    after?: () => void | Promise<void>
  ) {
    if (lock.current) return false;

    lock.current = true;

    setBusy(true);

    setMsg(null);

    setOk(null);

    try {
      const error = await action();

      if (error) {
        setMsg(error);

        return false;
      }

      setOk(success);

      try {
        await after?.();
      } catch {
        setMsg(
          "La operación se completó, pero no pudimos actualizar la información mostrada."
        );
      }

      return true;

    } catch (failure) {
      setMsg(
        failure instanceof Error
          ? failure.message
          : "No se pudo completar la operación. Revisa tu conexión."
      );

      return false;

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     GUARDAR DATOS PERSONALES
  ===================================== */

  async function saveProfile() {
    if (lock.current) return;

    const cleanName = name.trim();

    if (cleanName.length < 3) {
      setOk(null);

      setMsg(
        "El nombre debe tener al menos 3 caracteres."
      );

      return;
    }

    await run(
      () =>
        act(
          "/profile",
          "PATCH",
          {
            name: cleanName,
          }
        ),

      "Datos personales actualizados correctamente.",

      async () => {
        await reloadProfile();

        setNameDraft(null);
      }
    );
  }

  /* =====================================
     ACTUALIZAR CONTRASEÑA
  ===================================== */

  async function changePassword() {
    if (lock.current) return;

    setMsg(null);

    setOk(null);

    if (!current) {
      setMsg(
        "Ingresa tu contraseña actual."
      );

      return;
    }

    if (next.length < 8) {
      setMsg(
        "La nueva contraseña debe tener al menos 8 caracteres."
      );

      return;
    }

    if (next !== confirmation) {
      setMsg(
        "Las contraseñas no coinciden."
      );

      return;
    }

    await run(
      () =>
        act(
          "/profile/password",
          "POST",
          {
            current,
            next,
          }
        ),

      "Contraseña actualizada correctamente.",

      () => {
        setCurrent("");

        setNext("");

        setConfirmation("");
      }
    );
  }

  /* =====================================
     CERRAR UNA SESIÓN REMOTA
  ===================================== */

  async function revokeSession(
    session: Session
  ) {
    if (
      lock.current ||
      session.current
    ) {
      return;
    }

    setClosingSession(session.id);

    try {
      const success = await run(
        () =>
          act(
            `/auth/sessions/${encodeURIComponent(session.id)}`,
            "DELETE"
          ),

        "La sesión seleccionada se cerró correctamente.",

        async () => {
          await reloadSessions();
        }
      );

      if (success) {
        setConfirmSession(null);
      }

    } finally {
      setClosingSession(null);
    }
  }

  /* =====================================
     CERRAR SESIÓN ACTUAL
  ===================================== */

  function goHome() {
    if (lock.current) return;

    setCurrent("");

    setNext("");

    setConfirmation("");

    logout();

    router.replace("/");
  }

  /* =====================================
     ESTADO DE CARGA DEL PERFIL
  ===================================== */

  if (!profile) {
    return (
      <div
        aria-busy="true"
        aria-label="Cargando perfil"
        className="space-y-5"
      >

        <Skeleton className="h-14 w-64 max-w-full rounded-xl" />

        <Skeleton className="h-48 w-full rounded-3xl" />

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">

          <Skeleton className="h-72 w-full rounded-2xl" />

          <Skeleton className="h-96 w-full rounded-2xl" />

        </div>

      </div>
    );
  }

  /* =====================================
     INFORMACIÓN DEL USUARIO
  ===================================== */

  const suspended =
    profile.status === "suspendido";

  const category =
    CATEGORY_LABEL[
      profile.category ?? "general"
    ];

  const passwordMismatch =
    confirmation.length > 0 &&
    confirmation !== next;

  const passwordChecks = [
    {
      label: "Mínimo 8 caracteres",
      valid: next.length >= 8,
    },
    {
      label: "Las contraseñas coinciden",
      valid:
        next.length > 0 &&
        next === confirmation,
    },
  ];

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1320px] flex-col gap-5 pb-4 sm:gap-6">

      {/* =================================
          ENCABEZADO DE LA PÁGINA
      ================================= */}

      <div className="animate-fade-up flex items-center gap-3">

        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">

          <Settings
            size={28}
            aria-hidden="true"
          />

        </span>

        <div className="min-w-0">

          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Mi cuenta
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">

            Perfil y configuración

          </h1>

          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">

            Administra tu información,
            contraseña y sesiones activas.

          </p>

        </div>

      </div>

      {/* =================================
          TARJETA PRINCIPAL DEL USUARIO
      ================================= */}

      <section
        aria-label="Información de mi cuenta"
        className="animate-fade-up relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-emerald-950 via-emerald-800 to-emerald-700 p-5 text-white shadow-lg sm:p-8"
      >

        {/* Decoraciones */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-12 h-80 w-80 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-white/5"
        />

        <Fingerprint
          size={150}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-8 hidden text-white/5 lg:block"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">

          {/* Fotografía */}

          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/25 bg-white/10 text-3xl font-extrabold text-white shadow-lg">

            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo}
                alt="Fotografía de mi perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              initials(profile.name)
            )}

          </span>

          {/* Información principal */}

          <div className="min-w-0 flex-1">

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">

              Portal del pasajero

            </p>

            <h2 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">

              {profile.name}

            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-emerald-100">

              <GraduationCap
                size={18}
                aria-hidden="true"
              />

              {category}

            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  suspended
                    ? "border-red-200/30 bg-red-500/20 text-red-100"
                    : "border-white/20 bg-white/10 text-emerald-100"
                }`}
              >

                <ShieldCheck
                  size={15}
                  aria-hidden="true"
                />

                Cuenta{" "}

                {suspended
                  ? "suspendida"
                  : "activa"}

              </span>

              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-emerald-100">

                <span className="break-all">

                  ID: {profile.code ?? "-"}

                </span>

              </span>

            </div>

          </div>

          {/* Identidad institucional */}

          <div className="hidden shrink-0 text-right xl:block">

            <BadgeCheck
              size={38}
              aria-hidden="true"
              className="mb-2 ml-auto text-emerald-200/70"
            />

            <p className="text-sm font-extrabold tracking-wide">

              RUTABOL-SCZ

            </p>

            <p className="mt-1 text-[10px] text-emerald-200/70">

              Plataforma de movilidad urbana

            </p>

          </div>

        </div>

      </section>

      {suspended && (
        <Notice tone="warn">

          Tu cuenta está suspendida.
          Contacta con el soporte del sistema
          para obtener más información.

        </Notice>
      )}

      {/* =================================
          MENÚ Y CONTENIDO DEL PERFIL
      ================================= */}

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">

        {/* =================================
            MENÚ DE CONFIGURACIÓN
        ================================= */}

        <aside
          className={`min-w-0 space-y-4 ${
            sec
              ? "hidden md:block"
              : "block"
          }`}
        >

          <nav
            aria-label="Secciones del perfil"
            className={`${CARD} animate-fade-up delay-100 overflow-hidden p-3`}
          >

            <div className="px-3 pb-4 pt-3">

              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">

                Configuración de cuenta

              </p>

            </div>

            <div className="space-y-2">

              {SECTIONS.map((section) => {
                const Icon = section.icon;

                const selected =
                  active === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      pick(section.id)
                    }
                    aria-current={
                      selected
                        ? "page"
                        : undefined
                    }
                    className={`group flex min-h-[66px] w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >

                      <Icon
                        size={20}
                        aria-hidden="true"
                      />

                    </span>

                    <span className="min-w-0 flex-1">

                      <span
                        className={`block text-sm font-bold ${
                          selected
                            ? "text-emerald-900"
                            : "text-slate-700"
                        }`}
                      >

                        {section.label}

                      </span>

                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">

                        {section.hint}

                      </span>

                    </span>

                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        selected
                          ? "text-emerald-600"
                          : "text-slate-300"
                      }`}
                    />

                  </button>
                );
              })}

            </div>

            {/* Cerrar sesión */}

            <div className="mt-4 border-t border-slate-100 pt-4">

              {!confirmLogout ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setConfirmLogout(true)
                  }
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-600 transition-colors enabled:hover:bg-red-50 disabled:opacity-50"
                >

                  <LogOut
                    size={20}
                    aria-hidden="true"
                  />

                  Cerrar sesión

                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">

                  <p className="text-xs font-bold text-red-800">

                    ¿Deseas cerrar tu sesión?

                  </p>

                  <p className="text-[11px] leading-relaxed text-red-700">

                    Volverás a la página principal.

                  </p>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setConfirmLogout(false)
                      }
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >

                      Cancelar

                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={goHome}
                      className="min-h-10 rounded-lg bg-red-600 px-2 text-xs font-bold text-white enabled:hover:bg-red-700 disabled:opacity-50"
                    >

                      Confirmar

                    </button>

                  </div>

                </div>
              )}

            </div>

          </nav>

          {/* Tarjeta de soporte */}

          <div className="animate-fade-up delay-200 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">

            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">

              <Mail
                size={21}
                aria-hidden="true"
              />

            </span>

            <h3 className="text-sm font-bold text-emerald-950">

              ¿Necesitas ayuda?

            </h3>

            <p className="mt-2 text-xs leading-relaxed text-emerald-800/80">

              Contacta con nuestro equipo si necesitas
              corregir los datos de tu cuenta.

            </p>

            <a
              href="mailto:contacto@rutabol.bo"
              className="mt-3 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-bold text-emerald-700 hover:underline"
            >

              contacto@rutabol.bo

              <ArrowRight
                size={14}
                aria-hidden="true"
                className="shrink-0"
              />

            </a>

          </div>

        </aside>

        {/* =================================
            CONTENIDO DE CONFIGURACIÓN
        ================================= */}

        <div
          className={`min-w-0 flex-col gap-5 ${
            sec
              ? "flex"
              : "hidden md:flex"
          }`}
        >

          {/* Volver en celulares */}

          <button
            type="button"
            disabled={busy}
            onClick={() => pick(null)}
            className={`${OUTLINE} self-start md:hidden`}
          >

            <ChevronLeft
              size={18}
              aria-hidden="true"
            />

            Volver al perfil

          </button>

          {/* Mensajes de respuesta */}

          {msg && (
            <div role="alert">

              <ErrorState
                message={msg}
              />

            </div>
          )}

          {ok && (
            <div role="status">

              <Notice>{ok}</Notice>

            </div>
          )}

          {/* =================================
              DATOS PERSONALES
          ================================= */}

          {active === "datos" && (
            <SettingsCard
              icon={UserRound}
              title="Datos personales"
              description="Consulta y actualiza la información asociada a tu cuenta."
            >

              <form
                className="space-y-5"
                aria-busy={busy}
                onSubmit={(event) => {
                  event.preventDefault();

                  void saveProfile();
                }}
              >

                <TextField
                  id="n"
                  label="Nombre completo"
                  icon={UserRound}
                  value={name}
                  onChange={(event) =>
                    setNameDraft(
                      event.target.value
                    )
                  }
                  required
                  minLength={3}
                  autoComplete="name"
                  disabled={busy}
                  hint="Introduce tus nombres y apellidos."
                />

                {/* Campos informativos */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <ReadOnlyField
                    label="Identificador"
                    value={profile.code ?? "-"}
                    icon={Fingerprint}
                  />

                  <ReadOnlyField
                    label="Categoría del pasajero"
                    value={category}
                    icon={GraduationCap}
                  />

                </div>

                {/* Estado de cuenta */}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <ShieldCheck
                      size={22}
                      aria-hidden="true"
                      className={
                        suspended
                          ? "text-red-600"
                          : "text-emerald-700"
                      }
                    />

                    <div>

                      <p className="text-sm font-bold text-slate-700">

                        Estado de la cuenta

                      </p>

                      <p className="mt-1 text-xs text-slate-500">

                        Disponibilidad de tu cuenta

                      </p>

                    </div>

                  </div>

                  <StatusPill
                    tone={
                      suspended
                        ? "danger"
                        : "success"
                    }
                  >

                    Cuenta{" "}

                    {suspended
                      ? "suspendida"
                      : "activa"}

                  </StatusPill>

                </div>

                {/* Información adicional */}

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <Info
                    size={19}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-blue-700"
                  />

                  <p className="text-xs leading-relaxed text-blue-800">

                    Por seguridad, el identificador
                    y la categoría no se pueden
                    modificar desde esta pantalla.
                    Para corregirlos, escribe a{" "}

                    <a
                      href="mailto:contacto@rutabol.bo"
                      className="font-bold underline"
                    >

                      contacto@rutabol.bo

                    </a>

                    .

                  </p>

                </div>

                {/* Botones */}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNameDraft(null);

                      setMsg(null);

                      setOk(null);
                    }}
                    className={OUTLINE}
                  >

                    <X
                      size={17}
                      aria-hidden="true"
                    />

                    Descartar cambios

                  </button>

                  <div className="w-full sm:w-auto sm:min-w-[190px]">

                    <SubmitButton
                      busy={busy}
                      busyText="Guardando..."
                      icon={Save}
                      showArrow={false}
                      disabled={
                        name.trim() ===
                          profile.name.trim() ||
                        name.trim().length < 3
                      }
                    >

                      Guardar cambios

                    </SubmitButton>

                  </div>

                </div>

              </form>

            </SettingsCard>
          )}

          {/* =================================
              CAMBIAR CONTRASEÑA
          ================================= */}

          {active === "password" && (
            <SettingsCard
              icon={KeyRound}
              title="Cambiar contraseña"
              description="Actualiza tus credenciales para proteger el acceso a tu cuenta."
            >

              <form
                className="space-y-5"
                aria-busy={busy}
                onSubmit={(event) => {
                  event.preventDefault();

                  void changePassword();
                }}
              >

                {/* Contraseña actual */}

                <PasswordInput
                  id="c"
                  label="Contraseña actual"
                  value={current}
                  onChange={(event) =>
                    setCurrent(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña actual"
                  disabled={busy}
                />

                <div className="border-t border-slate-100" />

                {/* Nueva contraseña */}

                <PasswordInput
                  id="x"
                  label="Nueva contraseña"
                  value={next}
                  onChange={(event) =>
                    setNext(
                      event.target.value
                    )
                  }
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  disabled={busy}
                />

                {/* Confirmación */}

                <PasswordInput
                  id="confirm-new-password"
                  label="Confirmar nueva contraseña"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(
                      event.target.value
                    )
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repite tu nueva contraseña"
                  disabled={busy}
                  error={
                    passwordMismatch
                      ? "Las contraseñas no coinciden."
                      : null
                  }
                />

                {/* Validaciones visuales */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="mb-3 text-xs font-bold text-slate-700">

                    Requisitos de seguridad

                  </p>

                  <div
                    aria-live="polite"
                    className="space-y-3"
                  >

                    {passwordChecks.map(
                      ({ label, valid }) => (
                        <div
                          key={label}
                          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                            valid
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >

                          {valid ? (
                            <CheckCircle2
                              size={18}
                              aria-hidden="true"
                              className="shrink-0"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300"
                            />
                          )}

                          {label}

                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* Recomendación */}

                <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                  <ShieldCheck
                    size={22}
                    aria-hidden="true"
                    className="shrink-0 text-emerald-700"
                  />

                  <div>

                    <p className="text-xs font-bold text-emerald-900">

                      Protege tu cuenta

                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-emerald-800">

                      Utiliza una contraseña única y
                      evita compartirla con otras personas.

                    </p>

                  </div>

                </div>

                {/* Guardar contraseña */}

                <div className="border-t border-slate-100 pt-5">

                  <SubmitButton
                    busy={busy}
                    busyText="Actualizando..."
                    icon={LockKeyhole}
                    disabled={
                      !current ||
                      next.length < 8 ||
                      next !== confirmation
                    }
                  >

                    Actualizar contraseña

                  </SubmitButton>

                </div>

              </form>

            </SettingsCard>
          )}

          {/* =================================
              SESIONES ACTIVAS
          ================================= */}

          {active === "sesiones" && (
            <SettingsCard
              icon={MonitorSmartphone}
              title="Sesiones activas"
              description="Consulta y administra las sesiones abiertas con tu cuenta."
            >

              <div className="space-y-5">

                {/* Resumen */}

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-sm font-bold text-slate-800">

                      Accesos registrados

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      {sessions
                        ? `${sessions.length} ${sessions.length === 1 ? "sesión registrada" : "sesiones registradas"}`
                        : "Consultando sesiones..."}

                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={
                      sessionsLoading ||
                      busy
                    }
                    onClick={() =>
                      void reloadSessions()
                    }
                    className={OUTLINE}
                  >

                    <RefreshCw
                      size={16}
                      aria-hidden="true"
                      className={
                        sessionsLoading
                          ? "animate-spin"
                          : ""
                      }
                    />

                    Actualizar

                  </button>

                </div>

                {/* Error de consulta */}

                {sessionsError && !sessions ? (
                  <ErrorState
                    message={sessionsError}
                    onRetry={() =>
                      void reloadSessions()
                    }
                  />
                ) : !sessions ? (
                  <div className="space-y-3">

                    {[0, 1].map((item) => (
                      <Skeleton
                        key={item}
                        className="h-28 w-full rounded-2xl"
                      />
                    ))}

                  </div>
                ) : sessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

                    <MonitorSmartphone
                      size={36}
                      aria-hidden="true"
                      className="mx-auto mb-3 text-slate-400"
                    />

                    <p className="text-sm font-bold text-slate-700">

                      No hay sesiones registradas

                    </p>

                    <p className="mt-2 text-xs text-slate-500">

                      Actualiza la lista para volver
                      a consultar los accesos.

                    </p>

                  </div>
                ) : (
                  <>

                    {sessionsError && (
                      <Notice tone="warn">

                        No pudimos actualizar las sesiones.
                        Mostramos los últimos datos recibidos.

                      </Notice>
                    )}

                    {/* Listado de sesiones */}

                    <ul className="space-y-3">

                      {[...sessions]
                        .sort(
                          (a, b) =>
                            Number(b.current) -
                              Number(a.current) ||
                            b.lastSeenAt -
                              a.lastSeenAt
                        )
                        .map((session) => (
                          <li
                            key={session.id}
                            className={`min-w-0 rounded-2xl border p-4 transition-colors ${
                              session.current
                                ? "border-emerald-200 bg-emerald-50/50"
                                : "border-slate-200 bg-white"
                            }`}
                          >

                            <div className="flex flex-wrap items-start gap-3">

                              {/* Icono de sesión */}

                              <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                  session.current
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >

                                <MonitorSmartphone
                                  size={24}
                                  aria-hidden="true"
                                />

                              </span>

                              <div className="min-w-0 flex-1">

                                <p className="text-sm font-bold text-slate-900">

                                  {session.current
                                    ? "Sesión actual"
                                    : "Otra sesión activa"}

                                </p>

                                <div className="mt-3 space-y-2">

                                  <p className="flex items-start gap-2 text-xs text-slate-500">

                                    <CalendarDays
                                      size={14}
                                      aria-hidden="true"
                                      className="shrink-0"
                                    />

                                    <span>

                                      Iniciada:{" "}

                                      {dateTime(
                                        session.createdAt
                                      )}

                                    </span>

                                  </p>

                                  <p className="flex items-start gap-2 text-xs text-slate-500">

                                    <Clock
                                      size={14}
                                      aria-hidden="true"
                                      className="shrink-0"
                                    />

                                    <span>

                                      Último uso:{" "}

                                      {dateTime(
                                        session.lastSeenAt
                                      )}

                                    </span>

                                  </p>

                                </div>

                              </div>

                              {session.current && (
                                <StatusPill tone="success">

                                  <CheckCircle2
                                    size={13}
                                    aria-hidden="true"
                                  />

                                  Esta sesión

                                </StatusPill>
                              )}

                            </div>

                            {/* Cerrar sesiones remotas */}

                            {!session.current && (
                              <div className="mt-4 border-t border-slate-100 pt-4">

                                {confirmSession === session.id ? (
                                  <div className="space-y-3 rounded-xl border border-red-100 bg-red-50 p-3">

                                    <p className="text-xs font-bold text-red-800">

                                      ¿Cerrar esta sesión?

                                    </p>

                                    <p className="text-xs leading-relaxed text-red-700">

                                      Se revocará el acceso
                                      asociado a esta sesión.

                                    </p>

                                    <div className="grid grid-cols-2 gap-2">

                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          setConfirmSession(null)
                                        }
                                        className={OUTLINE}
                                      >

                                        Cancelar

                                      </button>

                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          void revokeSession(
                                            session
                                          )
                                        }
                                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-bold text-white enabled:hover:bg-red-700 disabled:opacity-50"
                                      >

                                        {closingSession === session.id ? (
                                          <LoaderCircle
                                            size={16}
                                            aria-hidden="true"
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <Trash2
                                            size={16}
                                            aria-hidden="true"
                                          />
                                        )}

                                        Confirmar

                                      </button>

                                    </div>

                                  </div>
                                ) : (
                                  <div className="flex justify-end">

                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        setConfirmSession(
                                          session.id
                                        )
                                      }
                                      className={DANGER}
                                    >

                                      <Trash2
                                        size={16}
                                        aria-hidden="true"
                                      />

                                      Cerrar sesión

                                    </button>

                                  </div>
                                )}

                              </div>
                            )}

                          </li>
                        ))}

                    </ul>

                  </>
                )}

                {/* Recomendación de seguridad */}

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <ShieldCheck
                    size={22}
                    aria-hidden="true"
                    className="shrink-0 text-blue-700"
                  />

                  <div>

                    <p className="text-xs font-bold text-blue-900">

                      Controla el acceso a tu cuenta

                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-blue-800">

                      Si no reconoces alguna sesión,
                      puedes cerrarla desde esta
                      sección y cambiar tu contraseña.

                    </p>

                  </div>

                </div>

              </div>

            </SettingsCard>
          )}

        </div>

      </div>

      {/* =================================
          PIE DE PÁGINA
      ================================= */}

      <div className="flex items-center justify-center gap-2 py-2 text-center text-[11px] text-slate-400">

        <ShieldCheck
          size={15}
          aria-hidden="true"
          className="shrink-0 text-emerald-600"
        />

        Administración de cuenta · RUTABOL-SCZ

      </div>

    </div>
  );
}
