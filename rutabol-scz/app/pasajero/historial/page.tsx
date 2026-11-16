"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquareWarning, Printer, Repeat } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/data";
import { useApp, type Ticket } from "@/lib/store";

const STATUS: Record<Ticket["status"], string> = {
  pagado: "Pagado, pendiente de abordar",
  abordado: "Abordado",
  rechazado: "Rechazado por el chofer",
  "pase-temporal": "Trasbordo con pase temporal",
};

export default function Historial() {
  const { world } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const tickets = world.tickets;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Historial de viajes</h1>
      {tickets.length === 0 && <p className="text-sm text-muted">Todavía no pagaste ningún pasaje.</p>}
      <ul className="flex flex-col gap-2">
        {tickets.map((t) => {
          const line = t.line ?? t.busId.split("-")[0];
          const internal = t.internal ?? t.busId.split("-")[1];
          const isOpen = open === t.id;
          return (
            <li key={t.id} className="card p-4">
              <button className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>
                <span>
                  <span className="block font-semibold">Línea {line} · Interno {internal}</span>
                  <span className="block text-sm text-muted">{new Date(t.at).toLocaleString("es-BO")}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">Bs {t.fare.toFixed(2)}</span>
                  <span className="block text-xs text-muted">{STATUS[t.status]}</span>
                </span>
              </button>
              {isOpen && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <dl className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                    <dt className="text-muted">Comprobante</dt>
                    <dd>{t.receiptNo ?? t.id}</dd>
                    <dt className="text-muted">Categoría</dt>
                    <dd>{CATEGORY_LABEL[t.category]}</dd>
                    <dt className="text-muted">Medio</dt>
                    <dd>{t.method}</dd>
                    <dt className="text-muted">Estado</dt>
                    <dd>{STATUS[t.status]}</dd>
                  </dl>
                  {t.fareReason && <p className="mt-2 text-xs text-muted">{t.fareReason}</p>}
                  {t.transferredTo && (
                    <p className="mt-2 flex items-center gap-2 rounded-lg bg-soft p-2 text-brand-dark">
                      <Repeat size={16} />
                      Trasbordo a la unidad {t.transferredTo}
                      {t.passCode ? ` · pase ${t.passCode}` : ""}. No se cobró de nuevo.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-outline h-9" onClick={() => window.print()}>
                      <Printer size={16} />
                      Imprimir comprobante
                    </button>
                    <Link
                      className="btn btn-outline h-9"
                      href={`/pasajero/reclamos?line=${line}&internal=${internal}&at=${t.at}&ticket=${t.id}`}
                    >
                      <MessageSquareWarning size={16} />
                      Reclamar este cobro
                    </Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
