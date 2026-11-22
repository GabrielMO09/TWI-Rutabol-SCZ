"use client";

import { useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import { Empty, Notice, Page, QueryState, Section, Table, useCommand } from "@/components/control/ui";

type InstitutionType = "colegio" | "universidad";
type Institution = {
  id: string;
  type: InstitutionType;
  name: string;
  address: string | null;
  emailDomain: string | null;
  enabled: boolean;
};

const path = "/control/institutions";

function InstitutionForm({ item, reload, cancel }: {
  item: Institution | null;
  reload: () => Promise<void>;
  cancel: () => void;
}) {
  const command = useCommand();
  const [type, setType] = useState<InstitutionType>(item?.type ?? "colegio");
  const [name, setName] = useState(item?.name ?? "");
  const [address, setAddress] = useState(item?.address ?? "");
  const [domain, setDomain] = useState(item?.emailDomain ?? "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await command.run(path, item ? "PATCH" : "POST", {
      ...(item ? { id: item.id } : {}),
      type, name: name.trim(), address: address.trim() || null,
      emailDomain: domain.trim() || null, enabled,
    }, "Institución guardada.");
    if (!saved) return;
    if (!item) {
      setType("colegio");
      setName("");
      setAddress("");
      setDomain("");
      setEnabled(true);
    }
    await reload();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Datos de la institución</legend>
        <div>
          <label htmlFor="institution-name" className="label">Nombre</label>
          <input id="institution-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={180} />
        </div>
        <div>
          <label htmlFor="institution-type" className="label">Tipo</label>
          <select id="institution-type" className="input" value={type} onChange={(event) => setType(event.target.value === "universidad" ? "universidad" : "colegio")}>
            <option value="colegio">Colegio</option>
            <option value="universidad">Universidad</option>
          </select>
        </div>
        <div>
          <label htmlFor="institution-address" className="label">Dirección</label>
          <input id="institution-address" className="input" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={1000} />
        </div>
        <div>
          <label htmlFor="institution-domain" className="label">Dominio de correo</label>
          <input id="institution-domain" className="input" value={domain} onChange={(event) => setDomain(event.target.value)}
            required={type === "universidad" && enabled} maxLength={254} placeholder="institucion.edu.bo" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Habilitada para el registro
        </label>
      </fieldset>
      <Notice {...command} />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={command.busy}>{command.busy ? "Guardando…" : "Guardar institución"}</button>
        {item && <button type="button" className="btn btn-outline" disabled={command.busy} onClick={cancel}>Cerrar edición</button>}
      </div>
    </form>
  );
}

export default function InstitutionsPage() {
  const query = useFetch<Institution[]>(path);
  const [selected, setSelected] = useState<string | null>(null);
  const item = query.data?.find(({ id }) => id === selected) ?? null;

  return (
    <Page title="Instituciones educativas">
      <QueryState {...query} />
      <Section title={item ? `Editar ${item.name}` : "Nueva institución"}>
        <InstitutionForm key={item?.id ?? "new"} item={item} reload={query.reload} cancel={() => setSelected(null)} />
      </Section>
      {query.data && (
        <Section title="Catálogo">
          {!query.data.length ? <Empty>No hay instituciones registradas.</Empty> : (
            <Table caption="Instituciones educativas" headers={["Nombre", "Tipo", "Dirección", "Dominio", "Estado", "Acción"]}>
              {[...query.data].sort((a, b) => Number(a.enabled) - Number(b.enabled)).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.type === "colegio" ? "Colegio" : "Universidad"}</td>
                  <td>{entry.address ?? "—"}</td>
                  <td>{entry.emailDomain ?? "—"}</td>
                  <td>{entry.enabled ? "Habilitada" : "Deshabilitada"}</td>
                  <td>
                    <button type="button" className="btn btn-outline" onClick={() => setSelected(entry.id)}
                      aria-label={`Editar ${entry.name}`} aria-pressed={entry.id === selected}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Section>
      )}
    </Page>
  );
}
