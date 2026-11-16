"use client";

import { useState } from "react";
import { useFetch } from "@/lib/api";
import type { Incident } from "@/components/control/types";
import { Empty, Notice, Page, QueryState, Status, date, text, useCommand } from "@/components/control/ui";

function IncidentCard({ item, reload }: { item: Incident; reload: () => Promise<void> }) {
  const command = useCommand();
  const next = item.status === "reportado" ? "en-atencion" : item.status === "en-atencion" ? "resuelto" : null;

  async function advance() {
    if (!next || !window.confirm(`¿Cambiar el incidente de la unidad ${item.busId} a «${text(next)}»?`)) return;
    if (await command.run(`/control/incidents/${encodeURIComponent(item.id)}`, "PATCH", { status: next }, `Incidente actualizado: ${text(next)}.`)) {
      await reload();
    }
  }

  return (
    <article className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{text(item.type)} · Línea {item.line} / {item.internal}</h2>
          <p className="mt-1 text-sm text-muted">Reportado: {date(item.at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm">Gravedad: <Status value={item.severity} /></span>
          <Status value={item.status} />
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{item.description}</p>
      <p className="text-xs text-muted">Última actualización: {date(item.updatedAt)}</p>
      {item.pos && <p className="text-sm text-muted">Ubicación: {item.pos[0]}, {item.pos[1]}</p>}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-dark">Ver historial</summary>
        {!item.history.length ? <Empty>Sin cambios registrados.</Empty> : (
          <ol className="mt-2 space-y-2 text-sm">
            {item.history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="rounded-lg bg-soft p-2">
                {date(entry.at)} · {text(entry.status)} · {entry.by}
              </li>
            ))}
          </ol>
        )}
      </details>
      <Notice {...command} />
      {next ? (
        <button type="button" className="btn btn-primary" disabled={command.busy} onClick={() => void advance()}>
          {command.busy ? "Guardando…" : next === "en-atencion" ? "Iniciar atención" : "Marcar como resuelto"}
        </button>
      ) : <p role="status" className="text-sm text-brand-dark">Atención finalizada.</p>}
    </article>
  );
}

export default function IncidentsPage() {
  const query = useFetch<Incident[]>("/control/incidents");
  const [status, setStatus] = useState("");
  const items = (query.data ?? []).filter((item) => !status || item.status === status)
    .sort((a, b) => b.at - a.at);

  return (
    <Page title="Incidentes" subtitle="Seguimiento desde el reporte hasta la resolución.">
      <div className="max-w-xs">
        <label htmlFor="incident-filter" className="label">Estado</label>
        <select id="incident-filter" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          {["reportado", "en-atencion", "resuelto"].map((value) => <option key={value} value={value}>{text(value)}</option>)}
        </select>
      </div>
      <QueryState {...query} />
      {!query.loading && !items.length && <Empty>No hay incidentes para este filtro.</Empty>}
      {items.map((item) => <IncidentCard key={item.id} item={item} reload={query.reload} />)}
    </Page>
  );
}
