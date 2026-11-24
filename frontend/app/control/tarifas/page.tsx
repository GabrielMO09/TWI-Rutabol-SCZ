"use client";

import { useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import type { Category, Fares } from "@/components/control/types";
import {
  Empty, Notice, Page, QueryState, Section, StatCard, Table, date, money, text, useCommand,
} from "@/components/control/ui";

const categories: Category[] = ["general", "escolar", "universitario"];

function FareForm({ current, reload }: { current: Fares; reload: () => Promise<void> }) {
  const command = useCommand();
  const [values, setValues] = useState<Record<Category, string>>({
    general: String(current.general),
    escolar: String(current.escolar),
    universitario: String(current.universitario),
  });
  const [reason, setReason] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    const next = {
      general: Number(values.general),
      escolar: Number(values.escolar),
      universitario: Number(values.universitario),
    };
    if (categories.some((category) => !values[category].trim() || !Number.isFinite(next[category]) || next[category] <= 0 || next[category] > 50)) {
      command.setError("Cada tarifa debe ser mayor que 0 y menor o igual a Bs 50.");
      return;
    }
    if (reason.trim().length < 5) {
      command.setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (categories.every((category) => next[category] === current[category])) {
      command.setError("Modifica al menos una tarifa.");
      return;
    }
    if (!window.confirm(`¿Aplicar las nuevas tarifas?\nGeneral: ${money(next.general)}\nEscolar: ${money(next.escolar)}\nUniversitario: ${money(next.universitario)}\nMotivo: ${reason.trim()}`)) return;
    if (await command.run("/control/fares", "PATCH", { ...next, reason: reason.trim() }, "Tarifas actualizadas y registradas en auditoría.")) {
      setReason("");
      await reload();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Nuevas tarifas</legend>
        {categories.map((category) => (
          <div key={category}>
            <label htmlFor={`fare-${category}`} className="psj-label">{text(category)} (Bs)</label>
            <input id={`fare-${category}`} type="number" min="0.01" max="50" step="0.01" className="psj-input" value={values[category]}
              onChange={(event) => setValues({ ...values, [category]: event.target.value })} required />
          </div>
        ))}
        <div className="sm:col-span-3">
          <label htmlFor="fare-reason" className="psj-label">Motivo del cambio</label>
          <textarea id="fare-reason" className="psj-input min-h-24 py-2" value={reason}
            onChange={(event) => setReason(event.target.value)} required minLength={5} />
        </div>
      </fieldset>
      <Notice {...command} />
      <button className="psj-btn psj-btn-primary" disabled={command.busy}>{command.busy ? "Aplicando…" : "Confirmar nuevas tarifas"}</button>
    </form>
  );
}

export default function FaresPage() {
  const query = useFetch<{ current: Fares; history: Fares[] }>("/control/fares");

  return (
    <Page title="Tarifas" subtitle="Consulta la tarifa vigente y registra cambios con su motivo.">
      <QueryState {...query} />
      {!query.loading && !query.error && !query.data && <Empty>No hay información de tarifas.</Empty>}
      {query.data && (
        <>
          <Section title="Tarifas vigentes">
            <p className="mb-4 text-sm text-(--psj-muted-strong)">Vigentes desde {date(query.data.current.validFrom)}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {categories.map((category) => <StatCard key={category} label={text(category)} value={money(query.data!.current[category])} />)}
            </div>
          </Section>
          <Section title="Actualizar tarifas">
            <FareForm current={query.data.current} reload={query.reload} />
          </Section>
          <Section title="Historial">
            {!query.data.history.length ? <Empty>No hay cambios anteriores.</Empty> : (
              <Table caption="Historial de tarifas" headers={["Vigencia desde", "General", "Escolar", "Universitario"]}>
                {[...query.data.history].sort((a, b) => b.validFrom - a.validFrom).map((fare, index) => (
                  <tr key={`${fare.validFrom}-${index}`}>
                    <td className="whitespace-nowrap">{date(fare.validFrom)}</td>
                    <td>{money(fare.general)}</td><td>{money(fare.escolar)}</td><td>{money(fare.universitario)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
