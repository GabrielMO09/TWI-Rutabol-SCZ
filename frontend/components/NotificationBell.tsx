"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { act, useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";

interface Notification {
  id: string;
  at: number;
  title: string;
  body: string;
  read: boolean;
}

export default function NotificationBell() {
  const { unread, refresh } = useApp();
  const { data: notes, reload } = useFetch<Notification[]>("/notifications/me", 6000);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="btn btn-outline relative h-9"
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={16} />
        {!!unread && (
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <section
          aria-label="Notificaciones"
          className="card absolute right-0 top-11 z-[1100] w-[min(22rem,calc(100vw-2rem))] p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Notificaciones</h2>
            <button
              className="tap text-sm font-medium text-brand underline"
              onClick={() => void act("/notifications/read-all").then(() => { reload(); void refresh(); })}
            >
              Marcar todo como leído
            </button>
          </div>
          {!notes || notes.length === 0 ? (
            <p className="text-sm text-muted">No tienes notificaciones.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto text-sm">
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
      )}
    </div>
  );
}
