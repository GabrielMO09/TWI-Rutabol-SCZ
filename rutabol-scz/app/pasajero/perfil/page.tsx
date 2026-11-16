"use client";

import { useState } from "react";
import { Bell, KeyRound, MonitorSmartphone, Save, Trash2 } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { act, useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";

interface Notification {
  id: string;
  at: number;
  title: string;
  body: string;
  read: boolean;
}
interface Session {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  current: boolean;
}

export default function Perfil() {
  const { profile, reloadProfile, refresh } = useApp();
  const { data: notes, reload: reloadNotes } = useFetch<Notification[]>("/notifications/me", 6000);
  const { data: sessions, reload: reloadSessions } = useFetch<Session[]>("/auth/sessions");
  const [name, setName] = useState(profile?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run(p: Promise<string | null>, success: string, after?: () => void) {
    const err = await p;
    setMsg(err);
    setOk(err ? null : success);
    if (!err) after?.();
  }

  if (!profile) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      <ErrorNote text={msg} />
      {ok && <p role="status" className="rounded-lg bg-soft px-3 py-2 text-sm text-brand-dark">{ok}</p>}

      <form
        className="card flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(act("/profile", "PATCH", { name }), "Datos actualizados.", () => void reloadProfile());
        }}
      >
        <h2 className="font-semibold">Datos personales</h2>
        <div>
          <label htmlFor="n" className="label">Nombre completo</label>
          <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
        </div>
        <p className="text-sm text-muted">
          Identificador: {profile.code ?? "-"} · Cuenta {profile.status === "suspendido" ? "suspendida" : "activa"}. Para
          corregir tu código o categoría escribe a contacto@rutabol.bo.
        </p>
        <button className="btn btn-primary self-start">
          <Save size={16} />
          Guardar
        </button>
      </form>

      <form
        className="card flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(act("/profile/password", "POST", { current, next }), "Contraseña actualizada.", () => {
            setCurrent("");
            setNext("");
          });
        }}
      >
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={18} />
          Cambiar contraseña
        </h2>
        <div>
          <label htmlFor="c" className="label">Contraseña actual</label>
          <input id="c" type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="x" className="label">Contraseña nueva</label>
          <input id="x" type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        <button className="btn btn-primary self-start">Actualizar contraseña</button>
      </form>

      <section className="card p-4" aria-labelledby="notif">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="notif" className="flex items-center gap-2 font-semibold">
            <Bell size={18} />
            Notificaciones
          </h2>
          <button className="text-sm font-medium text-brand underline" onClick={() => void act("/notifications/read-all").then(() => { reloadNotes(); void refresh(); })}>
            Marcar todo como leído
          </button>
        </div>
        {!notes || notes.length === 0 ? (
          <p className="text-sm text-muted">No tienes notificaciones.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {notes.map((n) => (
              <li key={n.id} className="py-2">
                <p className={n.read ? "" : "font-semibold"}>
                  {n.title} {!n.read && <span className="chip ml-1 bg-brand text-white">Nueva</span>}
                </p>
                <p className="text-muted">{n.body}</p>
                <p className="text-xs text-muted">{new Date(n.at).toLocaleString("es-BO")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4" aria-labelledby="ses">
        <h2 id="ses" className="mb-2 flex items-center gap-2 font-semibold">
          <MonitorSmartphone size={18} />
          Sesiones activas
        </h2>
        <ul className="divide-y divide-line text-sm">
          {(sessions ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                Iniciada {new Date(s.createdAt).toLocaleString("es-BO")}
                {s.current && <span className="chip ml-2 bg-soft text-brand-dark">Esta sesión</span>}
              </span>
              {!s.current && (
                <button
                  className="btn btn-outline h-8 text-danger"
                  onClick={() => void act(`/auth/sessions/${s.id}`, "DELETE").then(() => reloadSessions())}
                >
                  <Trash2 size={14} />
                  Cerrar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
