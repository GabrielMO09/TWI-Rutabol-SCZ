"use client";

import { useRef, useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import type { Line } from "@/components/control/types";
import { Chip, Empty, Notice, Page, QueryState, Section, Table, useCommand } from "@/components/control/ui";
import type { Stop } from "@/lib/routes";

const STOPS = "/control/stops";

function stopPath(id: string) {
  return `${STOPS}/${encodeURIComponent(id)}`;
}

export default function StopsPage() {
  const lines = useFetch<Line[]>("/control/lines");
  const query = useFetch<Stop[]>(STOPS);
  const command = useCommand();
  const [editing, setEditing] = useState<Stop | null>(null);
  const form = useRef<HTMLFormElement>(null);

  function edit(stop: Stop) {
    setEditing(stop);
    command.setError(null);
    command.setSuccess(null);
    form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clear() {
    setEditing(null);
    form.current?.reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body = {
      line: String(values.get("line") ?? ""),
      name: String(values.get("name") ?? "").trim(),
      reference: String(values.get("reference") ?? "").trim(),
      lat: Number(values.get("lat")),
      lng: Number(values.get("lng")),
      order: Number(values.get("order")),
      active: values.has("active"),
    };
    if (!body.name) {
      command.setError("Ingresa el nombre de la parada.");
      return;
    }
    if (await command.run(
      editing ? stopPath(editing.id) : STOPS,
      editing ? "PATCH" : "POST",
      body,
      editing ? "Parada actualizada." : "Parada creada.",
    )) {
      clear();
      await query.reload();
    }
  }

  async function remove(stop: Stop) {
    if (!window.confirm(`¿Eliminar la parada «${stop.name}» de la línea ${stop.line}?`)) return;
    if (await command.run(stopPath(stop.id), "DELETE", undefined, "Parada eliminada.")) {
      if (editing?.id === stop.id) clear();
      await query.reload();
    }
  }

  return (
    <Page title="Paradas" subtitle="Administra las paradas que aparecen en el mapa de cada línea.">
      <QueryState {...query} />
      <Section title="Paradas registradas">
        {!query.loading && !query.error && !query.data?.length && <Empty>No hay paradas registradas.</Empty>}
        {!!query.data?.length && (
          <Table caption="Gestión de paradas" headers={["Línea", "Parada", "Referencia", "Coordenadas", "Orden", "Estado", "Acciones"]}>
            {query.data.map((stop) => (
              <tr key={stop.id}>
                <td>{stop.line}</td>
                <td>{stop.name}</td>
                <td>{stop.reference || "—"}</td>
                <td>{stop.lat}, {stop.lng}</td>
                <td>{stop.order}</td>
                <td><Chip tone={stop.active ? "good" : "warn"}>{stop.active ? "Activa" : "Inactiva"}</Chip></td>
                <td>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-outline" disabled={command.busy}
                      onClick={() => edit(stop)} aria-label={`Editar parada ${stop.name}`}>Editar</button>
                    <button type="button" className="btn btn-outline" disabled={command.busy}
                      onClick={() => void remove(stop)} aria-label={`Eliminar parada ${stop.name}`}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={editing ? `Editar parada: ${editing.name}` : "Nueva parada"}>
        <QueryState {...lines} />
        {!lines.loading && !lines.error && !lines.data?.length && (
          <p className="my-3 text-sm text-muted">Registra una línea en Micro antes de agregar paradas.</p>
        )}
        <form key={editing?.id ?? "new"} ref={form} onSubmit={submit} className="mt-3 space-y-3">
          <fieldset disabled={command.busy || !lines.data?.length} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos de la parada</legend>
            <div>
              <label htmlFor="stop-line" className="label">Línea</label>
              <select id="stop-line" name="line" className="input" defaultValue={editing?.line ?? ""} required>
                <option value="">Selecciona una línea</option>
                {lines.data?.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.id} · {line.name}{line.active ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stop-name" className="label">Nombre</label>
              <input id="stop-name" name="name" className="input" defaultValue={editing?.name}
                maxLength={120} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="stop-reference" className="label">Referencia (opcional)</label>
              <input id="stop-reference" name="reference" className="input" defaultValue={editing?.reference}
                maxLength={180} />
            </div>
            <div>
              <label htmlFor="stop-lat" className="label">Latitud</label>
              <input id="stop-lat" name="lat" type="number" min={-90} max={90} step="any"
                className="input" defaultValue={editing?.lat} required />
            </div>
            <div>
              <label htmlFor="stop-lng" className="label">Longitud</label>
              <input id="stop-lng" name="lng" type="number" min={-180} max={180} step="any"
                className="input" defaultValue={editing?.lng} required />
            </div>
            <div>
              <label htmlFor="stop-order" className="label">Orden en la línea</label>
              <input id="stop-order" name="order" type="number" min={1} max={2147483647} step={1}
                className="input" defaultValue={editing?.order ?? 1} required />
            </div>
            <label htmlFor="stop-active" className="flex items-center gap-2 text-sm">
              <input id="stop-active" name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
              Parada activa
            </label>
          </fieldset>
          <Notice {...command} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={command.busy || !lines.data?.length}>
              {command.busy ? "Guardando…" : editing ? "Guardar parada" : "Crear parada"}
            </button>
            {editing && (
              <button type="button" className="btn btn-outline" disabled={command.busy} onClick={clear}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </Section>
    </Page>
  );
}
