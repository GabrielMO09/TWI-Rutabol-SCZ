"use client";

import { useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import type { Accreditation } from "@/components/control/types";
import { Empty, Notice, Page, QueryState, Status, date, text, useCommand } from "@/components/control/ui";

function effectiveStatus(item: Accreditation) {
  return item.status === "aprobada" && (!item.validUntil || item.validUntil <= Date.now())
    ? "vencida"
    : item.status;
}

function RequestCard({ item, reload }: { item: Accreditation; reload: () => Promise<void> }) {
  const command = useCommand();
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"aprobada" | "observada" | "rechazada">("aprobada");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    if (decision !== "aprobada" && note.trim().length < 5) {
      command.setError("Escribe una nota de al menos 5 caracteres para observar o rechazar.");
      return;
    }
    if (!window.confirm(`¿Confirmas la decisión «${text(decision)}» para ${item.code}?`)) return;
    if (await command.run(
      `/control/accreditations/${encodeURIComponent(item.id)}/decision`,
      "POST",
      { status: decision, note: note.trim() || undefined },
      `Decisión registrada: ${text(decision)}.`,
    )) {
      setNote("");
      await reload();
    }
  }

  const prefix = `accreditation-${item.id}`;
  return (
    <article className="card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{text(item.type)} · {item.institution}</h2>
        <Status value={effectiveStatus(item)} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Código</dt><dd className="break-all font-medium">{item.code}</dd></div>
        <div><dt className="text-muted">Usuario</dt><dd className="break-all">{item.userId}</dd></div>
        <div><dt className="text-muted">Correo confirmado</dt><dd>{item.emailVerified ? "Sí" : "No"}</dd></div>
        <div><dt className="text-muted">Vigencia hasta</dt><dd>{item.validUntil ? date(item.validUntil) : "Sin vigencia asignada"}</dd></div>
        <div><dt className="text-muted">Solicitud</dt><dd>{date(item.requestedAt)}</dd></div>
        <div><dt className="text-muted">Última decisión</dt><dd>{item.decidedAt ? date(item.decidedAt) : "Sin decisión"}</dd></div>
        {item.note && <div className="sm:col-span-2"><dt className="text-muted">Nota registrada</dt><dd className="whitespace-pre-wrap break-words">{item.note}</dd></div>}
      </dl>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-busy={command.busy}>
        <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Decisión para {item.code}</legend>
          <div>
            <label htmlFor={`${prefix}-decision`} className="label">Decisión</label>
            <select id={`${prefix}-decision`} className="input" value={decision}
              onChange={(event) => setDecision(event.target.value as typeof decision)}>
              <option value="aprobada">Aprobar</option>
              <option value="observada">Observar</option>
              <option value="rechazada">Rechazar</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${prefix}-note`} className="label">Nota {decision === "aprobada" ? "(opcional)" : "(obligatoria)"}</label>
            <textarea id={`${prefix}-note`} className="input min-h-24 py-2" value={note}
              onChange={(event) => setNote(event.target.value)} required={decision !== "aprobada"}
              minLength={decision === "aprobada" ? undefined : 5} />
          </div>
        </fieldset>
        <Notice {...command} />
        <button className={`btn ${decision === "rechazada" ? "btn-danger" : "btn-primary"}`} disabled={command.busy}>
          {command.busy ? "Guardando…" : decision === "aprobada" ? "Aprobar solicitud" : decision === "observada" ? "Observar solicitud" : "Rechazar solicitud"}
        </button>
      </form>
    </article>
  );
}

export default function AccreditationsPage() {
  const query = useFetch<Accreditation[]>("/control/accreditations");
  const [status, setStatus] = useState("");
  const items = (query.data ?? []).filter((item) => !status || effectiveStatus(item) === status);

  return (
    <Page title="Acreditaciones" subtitle="Revisa solicitudes y autoriza la aplicación de tarifas estudiantiles.">
      <div className="max-w-xs">
        <label htmlFor="accreditation-filter" className="label">Filtrar por estado</label>
        <select id="accreditation-filter" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          {["pendiente", "aprobada", "observada", "rechazada", "vencida"].map((value) => <option key={value} value={value}>{text(value)}</option>)}
        </select>
      </div>
      <QueryState {...query} />
      {!query.loading && !items.length && <Empty>No hay solicitudes para este filtro.</Empty>}
      {items.map((item) => <RequestCard key={item.id} item={item} reload={query.reload} />)}
    </Page>
  );
}
