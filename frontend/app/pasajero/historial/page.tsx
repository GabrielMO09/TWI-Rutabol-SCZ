"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BusFront, ChevronRight, MessageSquareWarning, Printer, Repeat, SearchX } from "lucide-react";
import { bs, dayLabel, time } from "@/components/pasajero/format";
import { EmptyState, LineBadge, Sheet, StatusPill, type Tone } from "@/components/pasajero/ui";
import { CATEGORY_LABEL } from "@/lib/data";
import { useApp, type Ticket } from "@/lib/store";

const STATUS: Record<Ticket["status"], { label: string; tone: Tone }> = {
  pagado: { label: "Pagado", tone: "neutral" },
  abordado: { label: "Abordado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
  "pase-temporal": { label: "Trasbordo", tone: "warn" },
};
const STATUS_LONG: Record<Ticket["status"], string> = {
  pagado: "Pagado, pendiente de abordar",
  abordado: "Abordado",
  rechazado: "Rechazado por el chofer",
  "pase-temporal": "Trasbordo con pase temporal",
};

const lineOf = (t: Ticket) => t.line ?? t.busId.split("-")[0];
const internalOf = (t: Ticket) => t.internal ?? t.busId.split("-")[1];

export default function Historial() {
  const { world } = useApp();
  const [status, setStatus] = useState("");
  const [line, setLine] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<Ticket | null>(null);
  const tickets = world.tickets;

  const lines = useMemo(() => [...new Set(tickets.map(lineOf))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })), [tickets]);
  const filtered = useMemo(() => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return tickets
      .filter((t) => (!status || t.status === status) && (!line || lineOf(t) === line) && t.at >= start && t.at <= end)
      .sort((a, b) => b.at - a.at);
  }, [tickets, status, line, from, to]);

  const groups = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of filtered) {
      const label = dayLabel(t.at);
      map.set(label, [...(map.get(label) ?? []), t]);
    }
    return [...map];
  }, [filtered]);

  const filtering = !!(status || line || from || to);
  function clear() {
    setStatus("");
    setLine("");
    setFrom("");
    setTo("");
  }

  if (tickets.length === 0) {
    return (
      <div className="psj-card mx-auto max-w-xl">
        <h1 className="sr-only">Historial de viajes</h1>
        <EmptyState icon={BusFront} title="Todavía no pagaste ningún pasaje">
          Cuando viajes, aquí verás cada pasaje con su comprobante.
          <div className="mt-4">
            <Link href="/pasajero" className="psj-btn psj-btn-primary">Explorar micros cercanos</Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="sr-only">Historial de viajes</h1>

      <section aria-label="Filtros" className="psj-screen-only psj-card grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
        <div>
          <label htmlFor="f-status" className="psj-label">Estado</label>
          <select id="f-status" className="psj-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-line" className="psj-label">Línea</label>
          <select id="f-line" className="psj-input" value={line} onChange={(e) => setLine(e.target.value)}>
            <option value="">Todas</option>
            {lines.map((l) => (
              <option key={l} value={l}>Línea {l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="psj-label">Desde</label>
          <input id="f-from" type="date" className="psj-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-to" className="psj-label">Hasta</label>
          <input id="f-to" type="date" className="psj-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </section>

      <div className="psj-screen-only flex flex-col gap-4">
        {filtering && (
          <p className="flex items-center justify-between text-sm text-(--psj-muted-strong)" role="status">
            {filtered.length} de {tickets.length} viajes
            <button type="button" className="psj-btn psj-btn-ghost min-h-11 px-2" onClick={clear}>Limpiar filtros</button>
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="psj-card">
            <EmptyState icon={SearchX} title="Sin resultados">
              Ningún viaje coincide con estos filtros.
            </EmptyState>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} aria-label={label}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-(--psj-muted-strong)">{label}</h2>
              <ul className="psj-card divide-y divide-(--psj-line) overflow-hidden">
                {items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setDetail(t)}
                      aria-label={`Ver detalle: línea ${lineOf(t)}, interno ${internalOf(t)}, ${bs(t.fare)}`}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--psj-green-soft)"
                    >
                      <LineBadge line={lineOf(t)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">Línea {lineOf(t)} · Interno {internalOf(t)}</span>
                        <span className="block text-xs text-(--psj-muted-strong)">{time(t.at)} · {CATEGORY_LABEL[t.category]}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{bs(t.fare)}</span>
                        <StatusPill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</StatusPill>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-(--psj-muted)" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Detalle del viaje">
        {detail && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3">
              <LineBadge line={lineOf(detail)} />
              <div className="flex-1">
                <p className="font-semibold">Línea {lineOf(detail)} · Interno {internalOf(detail)}</p>
                <p className="text-xs text-(--psj-muted-strong)">{dayLabel(detail.at)}, {time(detail.at)}</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{bs(detail.fare)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-(--psj-muted-strong)">Comprobante</dt>
              <dd className="text-right">{detail.receiptNo ?? detail.id}</dd>
              <dt className="text-(--psj-muted-strong)">Categoría</dt>
              <dd className="text-right">{CATEGORY_LABEL[detail.category]}</dd>
              <dt className="text-(--psj-muted-strong)">Medio</dt>
              <dd className="text-right">{detail.method}</dd>
              <dt className="text-(--psj-muted-strong)">Estado</dt>
              <dd className="text-right">{STATUS_LONG[detail.status]}</dd>
            </dl>
            {detail.fareReason && <p className="text-xs text-(--psj-muted-strong)">{detail.fareReason}</p>}
            {detail.transferredTo && (
              <p className="flex items-center gap-2 rounded-lg bg-(--psj-green-soft) p-3 text-(--psj-green-dark)">
                <Repeat size={16} aria-hidden="true" className="shrink-0" />
                Trasbordo a la unidad {detail.transferredTo}
                {detail.passCode ? ` · pase ${detail.passCode}` : ""}. No se cobró de nuevo.
              </p>
            )}
            <div className="psj-no-print flex flex-col gap-2 sm:flex-row">
              <button type="button" className="psj-btn psj-btn-outline flex-1" onClick={() => window.print()}>
                <Printer size={16} aria-hidden="true" />
                Imprimir comprobante
              </button>
              <Link
                className="psj-btn psj-btn-outline flex-1"
                href={`/pasajero/reclamos?line=${lineOf(detail)}&internal=${internalOf(detail)}&at=${detail.at}&ticket=${detail.id}`}
              >
                <MessageSquareWarning size={16} aria-hidden="true" />
                Reclamar este cobro
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
