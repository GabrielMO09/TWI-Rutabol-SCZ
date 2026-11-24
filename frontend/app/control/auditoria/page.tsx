"use client";

import { useState } from "react";
import { useFetch } from "@/lib/api";
import type { AuditEntry } from "@/components/control/types";
import { Chip, Empty, Page, QueryState, Table, date, text } from "@/components/control/ui";

export default function AuditPage() {
  const query = useFetch<AuditEntry[]>("/control/audit?limit=200");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState("");
  const needle = search.trim().toLocaleLowerCase("es-BO");
  const entries = (query.data ?? []).filter((entry) =>
    (!result || entry.result === result)
    && (!needle || [
      entry.actorId, text(entry.actorRole), entry.action, entry.target, entry.detail,
      date(entry.at), entry.result === "ok" ? "Correcto" : "Error",
    ].join(" ").toLocaleLowerCase("es-BO").includes(needle)),
  ).sort((a, b) => b.at - a.at);

  return (
    <Page title="Auditoría" subtitle="Últimos 200 registros de acciones y resultados del sistema.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="audit-search" className="psj-label">Buscar en los registros</label>
          <input id="audit-search" type="search" className="psj-input" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div>
          <label htmlFor="audit-result" className="psj-label">Resultado</label>
          <select id="audit-result" className="psj-input" value={result} onChange={(event) => setResult(event.target.value)}>
            <option value="">Todos los resultados</option><option value="ok">Correcto</option><option value="error">Error</option>
          </select>
        </div>
      </div>
      <QueryState {...query} />
      {query.data && <p role="status" className="text-sm text-(--psj-muted-strong)">{entries.length} registros visibles de {query.data.length} cargados.</p>}
      {!query.loading && !entries.length ? <Empty>No hay registros para estos filtros.</Empty> : !!entries.length && (
        <Table caption="Registro de auditoría" headers={["Fecha", "Actor", "Rol", "Acción", "Objetivo", "Resultado", "Detalle"]}>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap">{date(entry.at)}</td>
              <td className="break-all">{entry.actorId}</td><td>{text(entry.actorRole)}</td>
              <td className="break-words">{entry.action}</td><td className="break-all">{entry.target}</td>
              <td><Chip tone={entry.result === "ok" ? "good" : "danger"}>{entry.result === "ok" ? "Correcto" : "Error"}</Chip></td>
              <td className="min-w-48 max-w-md whitespace-pre-wrap break-words">{entry.detail || "Sin detalle"}</td>
            </tr>
          ))}
        </Table>
      )}
    </Page>
  );
}
