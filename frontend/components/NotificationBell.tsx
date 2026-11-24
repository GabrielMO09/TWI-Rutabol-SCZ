"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff, BadgeCheck, CheckCheck, MessageSquareWarning, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { dayLabel, time } from "@/components/pasajero/format";
import { EmptyState, Sheet } from "@/components/pasajero/ui";
import { act, useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";

interface Notification {
  id: string;
  at: number;
  title: string;
  body: string;
  read: boolean;
}

/** El backend no envía el tipo: se infiere del título solo para elegir el icono. */
function iconFor(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/acredit|carnet|correo/.test(t)) return BadgeCheck;
  if (/reclamo/.test(t)) return MessageSquareWarning;
  if (/recarga|saldo|tarjeta/.test(t)) return Wallet;
  if (/pasaje|pago|cobro|viaje/.test(t)) return Receipt;
  return Bell;
}

export default function NotificationBell() {
  const { unread, refresh } = useApp();
  const { data: notes, error, reload } = useFetch<Notification[]>("/notifications/me", 6000);
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of [...(notes ?? [])].sort((a, b) => b.at - a.at)) {
      const label = dayLabel(n.at);
      map.set(label, [...(map.get(label) ?? []), n]);
    }
    return [...map];
  }, [notes]);

  return (
    <>
      <button
        type="button"
        className="psj-icon-btn relative"
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Bell size={20} aria-hidden="true" />
        {!!unread && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--psj-danger) px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notificaciones">
        <div className="flex flex-col gap-3">
          {error && !notes && <p role="alert" className="text-sm text-(--psj-danger)">No pudimos cargar tus notificaciones.</p>}
          {!!unread && (
            <button
              type="button"
              className="psj-btn psj-btn-outline self-end"
              onClick={() => void act("/notifications/read-all").then(() => { void reload(); void refresh(); })}
            >
              <CheckCheck size={16} aria-hidden="true" />
              Marcar todo como leído
            </button>
          )}
          {groups.length === 0 ? (
            <EmptyState icon={BellOff} title="No tienes notificaciones">
              Te avisaremos aquí sobre recargas, acreditaciones y reclamos.
            </EmptyState>
          ) : (
            groups.map(([label, items]) => (
              <section key={label} aria-label={label}>
                <h3 className="mb-1 text-xs font-semibold uppercase capitalize tracking-wide text-(--psj-muted-strong)">{label}</h3>
                <ul className="divide-y divide-(--psj-line)">
                  {items.map((n) => {
                    const Icon = iconFor(n.title);
                    return (
                      <li key={n.id} className="flex gap-3 py-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-(--psj-bg) text-(--psj-muted-strong)" : "bg-(--psj-green-soft) text-(--psj-green)"}`}>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className={`flex items-center gap-2 ${n.read ? "" : "font-semibold"}`}>
                            {n.title}
                            {!n.read && <span className="psj-pill psj-pill-success">Nueva</span>}
                          </p>
                          <p className="text-(--psj-muted-strong)">{n.body}</p>
                          <p className="text-xs text-(--psj-muted-strong)">{time(n.at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
}
