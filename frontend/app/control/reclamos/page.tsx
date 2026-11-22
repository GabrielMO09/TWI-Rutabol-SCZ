"use client";

import { useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import type { Claim } from "@/components/control/types";
import { Empty, Notice, Page, QueryState, Status, date, money, text, useCommand } from "@/components/control/ui";

function Evidence({ value }: { value: string }) {
  let url: URL | null = null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") url = parsed;
  } catch {
    // La evidencia también puede ser texto.
  }
  return url
    ? <a className="break-all text-brand-dark underline" href={url.href} target="_blank" rel="noopener noreferrer">Abrir evidencia: {value}</a>
    : <p className="whitespace-pre-wrap break-words">{value}</p>;
}

function ClaimDetail({ claim, reload }: { claim: Claim; reload: () => Promise<void> }) {
  const command = useCommand();
  const [status, setStatus] = useState<Claim["status"]>(claim.status);
  const [response, setResponse] = useState(claim.response ?? "");
  const [refund, setRefund] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    const amount = refund.trim() === "" ? undefined : Number(refund);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)) {
      command.setError("El reembolso debe ser un importe no negativo con hasta dos decimales.");
      return;
    }
    if (!response.trim()) {
      command.setError("Escribe una respuesta para el pasajero.");
      return;
    }
    const confirmation = `¿Guardar la respuesta y cambiar el estado a «${text(status)}»?${amount && amount > 0 ? ` Se acreditarán ${money(amount)} al pasajero.` : ""}`;
    if (!window.confirm(confirmation)) return;
    if (await command.run(
      `/control/claims/${encodeURIComponent(claim.id)}`,
      "POST",
      { status, response: response.trim(), ...(amount !== undefined && { refund: amount }) },
      "Reclamo actualizado. La respuesta fue registrada.",
    )) {
      setRefund("");
      await reload();
    }
  }

  const prefix = `claim-${claim.id}`;
  return (
    <section className="mt-4 border-t border-line pt-4">
      <h3 className="mb-3 font-semibold">Detalle del reclamo</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Pasajero</dt><dd>{claim.name} · {claim.userId}</dd></div>
        <div><dt className="text-muted">Línea / interno</dt><dd>{claim.line} / {claim.internal}</dd></div>
        <div><dt className="text-muted">Fecha del viaje</dt><dd>{date(claim.tripAt)}</dd></div>
        <div><dt className="text-muted">Presentado</dt><dd>{date(claim.at)}</dd></div>
        <div><dt className="text-muted">Actualizado</dt><dd>{date(claim.updatedAt)}</dd></div>
        <div><dt className="text-muted">Pasaje</dt><dd>{claim.ticketId ?? "Sin pasaje asociado"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Descripción</dt><dd className="whitespace-pre-wrap break-words">{claim.description}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Evidencia</dt><dd>{claim.evidence ? <Evidence value={claim.evidence} /> : "Sin evidencia adjunta"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Respuesta registrada</dt><dd className="whitespace-pre-wrap break-words">{claim.response || "Sin respuesta"}</dd></div>
        <div><dt className="text-muted">Reembolso registrado</dt><dd>{money(claim.refund ?? 0)}</dd></div>
      </dl>
      <h3 className="mb-2 mt-4 font-semibold">Historial</h3>
      {!claim.history.length ? <Empty>Sin cambios registrados.</Empty> : (
        <ol className="space-y-2 text-sm">
          {claim.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="rounded-lg bg-soft p-3">
              <p>{date(entry.at)} · {text(entry.status)} · {entry.by}</p>
              {entry.note && <p className="mt-1 whitespace-pre-wrap break-words">{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={submit} className="mt-5 space-y-3" aria-busy={command.busy}>
        <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Responder reclamo</legend>
          <div>
            <label htmlFor={`${prefix}-status`} className="label">Nuevo estado</label>
            <select id={`${prefix}-status`} className="input" value={status} onChange={(event) => setStatus(event.target.value as Claim["status"])}>
              {["recibido", "en-revision", "resuelto", "rechazado"].map((value) => <option key={value} value={value}>{text(value)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${prefix}-refund`} className="label">Nuevo reembolso en Bs (opcional)</label>
            <input id={`${prefix}-refund`} type="number" min="0" step="0.01" className="input" value={refund} onChange={(event) => setRefund(event.target.value)} />
            <p className="mt-1 text-xs text-muted">Déjalo vacío para no enviar un nuevo reembolso. Un importe positivo acredita saldo.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${prefix}-response`} className="label">Respuesta al pasajero</label>
            <textarea id={`${prefix}-response`} className="input min-h-28 py-2" value={response} onChange={(event) => setResponse(event.target.value)} required />
          </div>
        </fieldset>
        <Notice {...command} />
        <button className="btn btn-primary" disabled={command.busy}>{command.busy ? "Guardando…" : "Guardar respuesta y estado"}</button>
      </form>
    </section>
  );
}

export default function ClaimsPage() {
  const query = useFetch<Claim[]>("/control/claims");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const claims = (query.data ?? []).filter((claim) => !status || claim.status === status);

  return (
    <Page title="Reclamos" subtitle="Consulta evidencias, responde al pasajero y registra la resolución.">
      <div className="max-w-xs">
        <label htmlFor="claim-filter" className="label">Estado</label>
        <select id="claim-filter" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          {["recibido", "en-revision", "resuelto", "rechazado"].map((value) => <option key={value} value={value}>{text(value)}</option>)}
        </select>
      </div>
      <QueryState {...query} />
      {!query.loading && !claims.length && <Empty>No hay reclamos para este filtro.</Empty>}
      {claims.map((claim) => (
        <article key={claim.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{claim.name} · Línea {claim.line} / {claim.internal}</h2>
              <p className="mt-1 text-sm text-muted">{date(claim.at)} · {claim.id}</p>
              <div className="mt-2"><Status value={claim.status} /></div>
            </div>
            <button type="button" className="btn btn-outline" aria-expanded={selected === claim.id}
              aria-controls={`detail-${claim.id}`} onClick={() => setSelected(selected === claim.id ? null : claim.id)}>
              {selected === claim.id ? "Cerrar detalle" : "Ver detalle y responder"}
            </button>
          </div>
          <div id={`detail-${claim.id}`} hidden={selected !== claim.id}>
            {selected === claim.id && <ClaimDetail key={claim.id} claim={claim} reload={query.reload} />}
          </div>
        </article>
      ))}
    </Page>
  );
}
