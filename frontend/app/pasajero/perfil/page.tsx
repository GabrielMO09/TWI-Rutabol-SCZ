"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, KeyRound, LogOut, MonitorSmartphone, Save, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { dateTime } from "@/components/pasajero/format";
import { ErrorState, Notice, Skeleton, StatusPill } from "@/components/pasajero/ui";
import { act, useFetch } from "@/lib/api";
import { CATEGORY_LABEL } from "@/lib/data";
import { useApp } from "@/lib/store";

interface Session {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  current: boolean;
}

type Section = "datos" | "password" | "sesiones";
const SECTIONS: { id: Section; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "datos", label: "Datos personales", hint: "Nombre y datos de la cuenta", icon: UserRound },
  { id: "password", label: "Contraseña", hint: "Cambia tu contraseña", icon: KeyRound },
  { id: "sesiones", label: "Sesiones activas", hint: "Dispositivos con tu cuenta abierta", icon: MonitorSmartphone },
];

export default function Perfil() {
  const { profile, reloadProfile, logout } = useApp();
  const router = useRouter();
  const { data: sessions, error: sessionsError, reload: reloadSessions } = useFetch<Session[]>("/auth/sessions");
  const [name, setName] = useState(profile?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  // En teléfono null = lista de opciones; en escritorio se muestra "datos" por defecto.
  const [sec, setSec] = useState<Section | null>(null);
  const active = sec ?? "datos";

  async function run(p: Promise<string | null>, success: string, after?: () => void) {
    const err = await p;
    setMsg(err);
    setOk(err ? null : success);
    if (!err) after?.();
  }

  function pick(s: Section | null) {
    setSec(s);
    setMsg(null);
    setOk(null);
  }

  if (!profile) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 md:grid md:grid-cols-[240px_1fr] md:items-start lg:max-w-5xl lg:grid-cols-[280px_1fr] lg:gap-6">
      <h1 className="sr-only">Mi perfil</h1>

      <nav aria-label="Secciones del perfil" className={`${sec ? "hidden md:flex" : "flex"} psj-card flex-col gap-1 p-2`}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            aria-current={sec ? (active === s.id ? "page" : undefined) : active === s.id ? "page" : undefined}
            className="psj-side-link w-full text-left"
          >
            <s.icon size={20} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block">{s.label}</span>
              <span className="block text-xs font-normal text-(--psj-muted-strong) md:hidden">{s.hint}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="md:hidden" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => { logout(); router.replace("/"); }}
          className="psj-side-link w-full text-left text-(--psj-danger)"
        >
          <LogOut size={20} aria-hidden="true" />
          Cerrar sesión
        </button>
      </nav>

      <div className={`${sec ? "flex" : "hidden md:flex"} flex-col gap-4 lg:max-w-2xl`}>
        <div className="psj-card hidden items-center gap-4 p-5 lg:flex">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--psj-green-soft) text-(--psj-green)">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound size={28} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{profile.name}</p>
            <p className="text-sm text-(--psj-muted-strong)">{CATEGORY_LABEL[profile.category ?? "general"]} · {profile.code ?? "-"}</p>
          </div>
          <StatusPill tone={profile.status === "suspendido" ? "danger" : "success"}>
            Cuenta {profile.status === "suspendido" ? "suspendida" : "activa"}
          </StatusPill>
        </div>
        <button type="button" className="psj-btn psj-btn-ghost self-start px-2 md:hidden" onClick={() => pick(null)}>
          <ChevronLeft size={18} aria-hidden="true" />
          Perfil
        </button>
        {msg && <ErrorState message={msg} />}
        {ok && <Notice>{ok}</Notice>}

        {active === "datos" && (
          <form
            className="psj-card flex flex-col gap-3 p-4 lg:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void run(act("/profile", "PATCH", { name }), "Datos actualizados.", () => void reloadProfile());
            }}
          >
            <h2 className="font-semibold">Datos personales</h2>
            <div>
              <label htmlFor="n" className="psj-label">Nombre completo</label>
              <input id="n" className="psj-input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-(--psj-muted-strong)">
              Identificador: {profile.code ?? "-"}
              <StatusPill tone={profile.status === "suspendido" ? "danger" : "success"}>
                Cuenta {profile.status === "suspendido" ? "suspendida" : "activa"}
              </StatusPill>
            </p>
            <p className="text-xs text-(--psj-muted-strong)">Para corregir tu código o categoría escribe a contacto@rutabol.bo.</p>
            <button className="psj-btn psj-btn-primary self-start">
              <Save size={16} aria-hidden="true" />
              Guardar
            </button>
          </form>
        )}

        {active === "password" && (
          <form
            className="psj-card flex flex-col gap-3 p-4 lg:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void run(act("/profile/password", "POST", { current, next }), "Contraseña actualizada.", () => {
                setCurrent("");
                setNext("");
              });
            }}
          >
            <h2 className="font-semibold">Cambiar contraseña</h2>
            <div>
              <label htmlFor="c" className="psj-label">Contraseña actual</label>
              <input id="c" type="password" className="psj-input" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            </div>
            <div>
              <label htmlFor="x" className="psj-label">Contraseña nueva</label>
              <input id="x" type="password" className="psj-input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
              <p className="mt-1 text-xs text-(--psj-muted-strong)">Mínimo 8 caracteres.</p>
            </div>
            <button className="psj-btn psj-btn-primary self-start">Actualizar contraseña</button>
          </form>
        )}

        {active === "sesiones" && (
          <section className="psj-card p-4 lg:p-6" aria-labelledby="ses">
            <h2 id="ses" className="mb-2 font-semibold">Sesiones activas</h2>
            {sessionsError && !sessions ? (
              <ErrorState message={sessionsError} onRetry={() => void reloadSessions()} />
            ) : !sessions ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <ul className="divide-y divide-(--psj-line) text-sm">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium">
                        Iniciada {dateTime(s.createdAt)}
                        {s.current && <StatusPill tone="success">Esta sesión</StatusPill>}
                      </span>
                      <span className="block text-xs text-(--psj-muted-strong)">Último uso {dateTime(s.lastSeenAt)}</span>
                    </span>
                    {!s.current && (
                      <button
                        type="button"
                        className="psj-btn psj-btn-danger-outline"
                        onClick={() => void act(`/auth/sessions/${s.id}`, "DELETE").then(() => reloadSessions())}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Cerrar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
