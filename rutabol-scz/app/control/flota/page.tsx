"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useFetch } from "@/lib/api";
import type { Bus, Driver, Line } from "@/components/control/types";
import {
  Chip, Empty, Notice, Page, QueryState, Section, Status, Table, useCommand,
} from "@/components/control/ui";

type Tab = "lines" | "buses" | "drivers";
const tabs: { id: Tab; label: string }[] = [
  { id: "lines", label: "Líneas" },
  { id: "buses", label: "Buses" },
  { id: "drivers", label: "Conductores" },
];

function parseWaypoints(raw: string): [number, number][] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length < 2) throw new Error("Ingresa al menos dos puntos.");
  return value.map((point: unknown) => {
    if (!Array.isArray(point) || point.length !== 2) throw new Error("Cada punto debe ser [latitud, longitud].");
    const lat: unknown = point[0];
    const lng: unknown = point[1];
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Las coordenadas deben ser números válidos: latitud entre -90 y 90, longitud entre -180 y 180.");
    }
    return [lat, lng];
  });
}

function LinesPanel() {
  const query = useFetch<Line[]>("/control/lines");
  const command = useCommand();
  const [editing, setEditing] = useState<Line | null>(null);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [waypoints, setWaypoints] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function clear() {
    setEditing(null);
    setId("");
    setName("");
    setActive(true);
    setWaypoints("");
  }

  function edit(line: Line) {
    setEditing(line);
    setId(line.id);
    setName(line.name);
    setActive(line.active);
    setWaypoints("");
    command.setError(null);
    command.setSuccess(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLInputElement>("#line-name")?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    if (!name.trim() || (!editing && !id.trim())) {
      command.setError("El identificador y el nombre son obligatorios.");
      return;
    }
    let points: [number, number][] | undefined;
    if (!editing) {
      try {
        points = parseWaypoints(waypoints);
      } catch (failure) {
        command.setError(failure instanceof SyntaxError ? "El JSON de puntos no es válido." : failure instanceof Error ? failure.message : "Revisa los puntos.");
        return;
      }
    }
    if (!window.confirm(editing ? `¿Guardar los cambios de la línea ${editing.id}?` : `¿Crear la línea ${id.trim()}?`)) return;
    if (await command.run(
      editing ? `/control/lines/${encodeURIComponent(editing.id)}` : "/control/lines",
      editing ? "PATCH" : "POST",
      editing ? { name: name.trim(), active } : { id: id.trim(), name: name.trim(), waypoints: points },
      editing ? "Línea actualizada." : "Línea creada.",
    )) {
      clear();
      await query.reload();
    }
  }

  async function toggle(line: Line) {
    if (!window.confirm(`¿${line.active ? "Desactivar" : "Activar"} la línea ${line.id}?`)) return;
    if (await command.run(`/control/lines/${encodeURIComponent(line.id)}`, "PATCH", { active: !line.active }, "Habilitación de la línea actualizada.")) await query.reload();
  }

  return (
    <div className="space-y-5">
      <QueryState {...query} />
      <Section title="Líneas registradas">
        {!query.loading && !query.data?.length ? <Empty>No hay líneas registradas.</Empty> : !!query.data?.length && (
          <Table caption="Gestión de líneas" headers={["Identificador", "Nombre", "Recorrido", "Estado", "Acciones"]}>
            {query.data.map((line) => (
              <tr key={line.id}>
                <td>{line.id}</td><td>{line.name}</td><td>{line.waypoints.length} puntos</td>
                <td><Chip tone={line.active ? "good" : "warn"}>{line.active ? "Activa" : "Inactiva"}</Chip></td>
                <td><div className="flex gap-2">
                  <button type="button" className="btn btn-outline" disabled={command.busy} onClick={() => edit(line)} aria-label={`Editar línea ${line.id}`}>Editar</button>
                  <button type="button" className="btn btn-outline" disabled={command.busy} onClick={() => void toggle(line)}
                    aria-label={`${line.active ? "Desactivar" : "Activar"} línea ${line.id}`}>{line.active ? "Desactivar" : "Activar"}</button>
                </div></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
      <Section title={editing ? `Editar línea ${editing.id}` : "Nueva línea"}>
        <form ref={formRef} onSubmit={submit} className="space-y-3">
          <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos de la línea</legend>
            <div>
              <label htmlFor="line-id" className="label">Identificador</label>
              <input id="line-id" className="input" value={id} disabled={!!editing} onChange={(event) => setId(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="line-name" className="label">Nombre</label>
              <input id="line-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            {editing ? (
              <div className="sm:col-span-2">
                <p className="mb-3 text-sm text-muted">Recorrido registrado: {editing.waypoints.length} puntos.</p>
                <label htmlFor="line-active" className="flex items-center gap-2 text-sm">
                  <input id="line-active" type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Línea activa
                </label>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="line-points" className="label">Puntos del recorrido en JSON</label>
                <textarea id="line-points" className="input min-h-28 py-2 font-mono" value={waypoints}
                  onChange={(event) => setWaypoints(event.target.value)} required aria-describedby="line-points-help"
                  placeholder="[[-17.78,-63.18],[-17.79,-63.19]]" />
                <p id="line-points-help" className="mt-1 text-xs text-muted">Formato: [[latitud,longitud],…]. Se requieren al menos dos puntos.</p>
              </div>
            )}
          </fieldset>
          <Notice {...command} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={command.busy}>{command.busy ? "Guardando…" : editing ? "Guardar línea" : "Crear línea"}</button>
            {editing && <button type="button" className="btn btn-outline" disabled={command.busy} onClick={clear}>Cancelar edición</button>}
          </div>
        </form>
      </Section>
    </div>
  );
}

function BusesPanel() {
  const query = useFetch<Bus[]>("/control/buses");
  const lines = useFetch<Line[]>("/control/lines");
  const command = useCommand();
  const [editing, setEditing] = useState<Bus | null>(null);
  const [line, setLine] = useState("");
  const [internal, setInternal] = useState("");
  const [plate, setPlate] = useState("");
  const [max, setMax] = useState("25");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<Bus["status"]>("activo");
  const formRef = useRef<HTMLFormElement>(null);

  function clear() {
    setEditing(null);
    setLine("");
    setInternal("");
    setPlate("");
    setMax("25");
    setActive(true);
    setStatus("activo");
  }

  function edit(bus: Bus) {
    setEditing(bus);
    setLine(bus.line);
    setInternal(bus.internal);
    setPlate(bus.plate);
    setMax(String(bus.max));
    setActive(bus.active);
    setStatus(bus.status);
    command.setError(null);
    command.setSuccess(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLInputElement>("#bus-plate")?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    const capacity = Number(max);
    if (!Number.isInteger(capacity) || capacity < 18 || capacity > 25) {
      command.setError("El aforo debe ser un número entero entre 18 y 25.");
      return;
    }
    if (!plate.trim() || !line.trim() || !internal.trim()) {
      command.setError("Completa la línea, el interno y la placa.");
      return;
    }
    if (!window.confirm(editing ? `¿Guardar los cambios de la unidad ${editing.id}?` : `¿Crear la unidad ${line}-${internal.trim()}?`)) return;
    if (await command.run(
      editing ? `/control/buses/${encodeURIComponent(editing.id)}` : "/control/buses",
      editing ? "PATCH" : "POST",
      editing ? { plate: plate.trim(), max: capacity, active, status } : { line, internal: internal.trim(), plate: plate.trim(), max: capacity },
      editing ? "Bus actualizado." : "Bus creado.",
    )) {
      clear();
      await query.reload();
    }
  }

  async function toggle(bus: Bus) {
    if (!window.confirm(`¿${bus.active ? "Desactivar" : "Activar"} la unidad ${bus.id}?`)) return;
    if (await command.run(`/control/buses/${encodeURIComponent(bus.id)}`, "PATCH", { active: !bus.active }, "Habilitación del bus actualizada.")) await query.reload();
  }

  return (
    <div className="space-y-5">
      <QueryState {...query} />
      <Section title="Buses registrados">
        {!query.loading && !query.data?.length ? <Empty>No hay buses registrados.</Empty> : !!query.data?.length && (
          <Table caption="Gestión de buses" headers={["Línea", "Interno", "Placa", "Aforo", "Estado", "Habilitación", "Acciones"]}>
            {query.data.map((bus) => (
              <tr key={bus.id}>
                <td>{bus.line}</td><td>{bus.internal}</td><td className="whitespace-nowrap">{bus.plate}</td><td>{bus.max}</td>
                <td><Status value={bus.status} /></td>
                <td><Chip tone={bus.active ? "good" : "warn"}>{bus.active ? "Activo" : "Inactivo"}</Chip></td>
                <td><div className="flex gap-2">
                  <button type="button" className="btn btn-outline" disabled={command.busy} onClick={() => edit(bus)} aria-label={`Editar bus ${bus.id}`}>Editar</button>
                  <button type="button" className="btn btn-outline" disabled={command.busy} onClick={() => void toggle(bus)}
                    aria-label={`${bus.active ? "Desactivar" : "Activar"} bus ${bus.id}`}>{bus.active ? "Desactivar" : "Activar"}</button>
                </div></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
      <Section title={editing ? `Editar bus ${editing.id}` : "Nuevo bus"}>
        <QueryState {...lines} />
        {!lines.loading && !lines.data?.length && <p className="my-3 text-sm text-muted">Registra una línea antes de crear un bus.</p>}
        <form ref={formRef} onSubmit={submit} className="mt-3 space-y-3">
          <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos del bus</legend>
            <div>
              <label htmlFor="bus-line" className="label">Línea</label>
              <select id="bus-line" className="input" value={line} onChange={(event) => setLine(event.target.value)} disabled={!!editing} required>
                <option value="">Selecciona una línea</option>
                {editing && !lines.data?.some((item) => item.id === line) && <option value={line}>{line}</option>}
                {lines.data?.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bus-internal" className="label">Interno</label>
              <input id="bus-internal" className="input" value={internal} onChange={(event) => setInternal(event.target.value)} disabled={!!editing} required />
            </div>
            <div>
              <label htmlFor="bus-plate" className="label">Placa</label>
              <input id="bus-plate" className="input" value={plate} onChange={(event) => setPlate(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="bus-max" className="label">Aforo máximo</label>
              <input id="bus-max" type="number" min="18" max="25" step="1" className="input" value={max} onChange={(event) => setMax(event.target.value)} required />
            </div>
            {editing && (
              <>
                <div>
                  <label htmlFor="bus-status" className="label">Estado operativo</label>
                  <select id="bus-status" className="input" value={status} onChange={(event) => setStatus(event.target.value as Bus["status"])}>
                    <option value="activo">Activo</option><option value="descanso">Descanso</option><option value="emergencia">Emergencia</option>
                  </select>
                </div>
                <label htmlFor="bus-active" className="flex items-center gap-2 text-sm">
                  <input id="bus-active" type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Bus habilitado
                </label>
              </>
            )}
          </fieldset>
          <Notice {...command} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={command.busy || (!editing && !lines.data?.length)}>
              {command.busy ? "Guardando…" : editing ? "Guardar bus" : "Crear bus"}
            </button>
            {editing && <button type="button" className="btn btn-outline" disabled={command.busy} onClick={clear}>Cancelar edición</button>}
          </div>
        </form>
      </Section>
    </div>
  );
}

function driverId(driver: Driver) {
  return driver.id ?? driver.userId ?? null;
}

function driverActive(driver: Driver) {
  return driver.active ?? driver.status === "activo";
}

function DriversPanel() {
  const query = useFetch<Driver[]>("/control/drivers");
  const buses = useFetch<Bus[]>("/control/buses");
  const command = useCommand();
  const [editing, setEditing] = useState<Driver | null>(null);
  const [name, setName] = useState("");
  const [busId, setBusId] = useState("");
  const [pin, setPin] = useState("");
  const [active, setActive] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  function clear() {
    setEditing(null);
    setName("");
    setBusId("");
    setPin("");
    setActive(true);
  }

  function edit(driver: Driver) {
    setEditing(driver);
    setName(driver.name);
    setBusId(`${driver.line}-${driver.internal}`);
    setPin("");
    setActive(driverActive(driver));
    command.setError(null);
    command.setSuccess(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLInputElement>("#driver-name")?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    if (!name.trim()) {
      command.setError("Ingresa el nombre del conductor.");
      return;
    }
    if ((!editing || pin !== "") && !/^\d{4}$/.test(pin)) {
      command.setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }
    const selectedBus = buses.data?.find((bus) => bus.id === busId);
    if (!editing && !selectedBus) {
      command.setError("Selecciona un bus registrado.");
      return;
    }
    const target = editing ? driverId(editing) : null;
    if (editing && !target) {
      command.setError("El servidor no proporcionó un identificador para este conductor.");
      return;
    }
    if (!window.confirm(editing ? `¿Guardar los cambios de ${editing.name}?` : `¿Crear el conductor y asignarlo a la unidad ${busId}?`)) return;
    if (await command.run(
      editing && target ? `/control/drivers/${encodeURIComponent(target)}` : "/control/drivers",
      editing ? "PATCH" : "POST",
      editing
        ? { name: name.trim(), active, ...(pin && { pin }) }
        : { name: name.trim(), line: selectedBus?.line, internal: selectedBus?.internal, pin },
      editing ? "Conductor actualizado." : "Conductor creado y asignado.",
    )) {
      clear();
      await query.reload();
    }
  }

  async function toggle(driver: Driver) {
    const target = driverId(driver);
    if (!target) {
      command.setError("El servidor no proporcionó un identificador para este conductor.");
      return;
    }
    if (!window.confirm(`¿${driverActive(driver) ? "Desactivar" : "Activar"} al conductor ${driver.name}?`)) return;
    if (await command.run(`/control/drivers/${encodeURIComponent(target)}`, "PATCH", { active: !driverActive(driver) }, "Habilitación del conductor actualizada.")) await query.reload();
  }

  return (
    <div className="space-y-5">
      <QueryState {...query} />
      <Section title="Conductores registrados">
        {!query.loading && !query.data?.length ? <Empty>No hay conductores registrados.</Empty> : !!query.data?.length && (
          <Table caption="Gestión de conductores" headers={["Nombre", "Línea", "Interno", "Estado", "Acciones"]}>
            {query.data.map((driver) => (
              <tr key={driverId(driver) ?? `${driver.line}-${driver.internal}`}>
                <td>{driver.name}</td><td>{driver.line}</td><td>{driver.internal}</td>
                <td><Chip tone={driverActive(driver) ? "good" : "warn"}>{driverActive(driver) ? "Activo" : "Inactivo"}</Chip></td>
                <td><div className="flex gap-2">
                  <button type="button" className="btn btn-outline" disabled={command.busy || !driverId(driver)} onClick={() => edit(driver)} aria-label={`Editar conductor ${driver.name}`}>Editar</button>
                  <button type="button" className="btn btn-outline" disabled={command.busy || !driverId(driver)} onClick={() => void toggle(driver)}
                    aria-label={`${driverActive(driver) ? "Desactivar" : "Activar"} conductor ${driver.name}`}>{driverActive(driver) ? "Desactivar" : "Activar"}</button>
                </div></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
      <Section title={editing ? `Editar conductor: ${editing.name}` : "Nuevo conductor"}>
        <QueryState {...buses} />
        {!buses.loading && !buses.data?.length && <p className="my-3 text-sm text-muted">Registra un bus antes de asignar un conductor.</p>}
        <form ref={formRef} onSubmit={submit} className="mt-3 space-y-3">
          <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos del conductor</legend>
            <div>
              <label htmlFor="driver-name" className="label">Nombre completo</label>
              <input id="driver-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="driver-bus" className="label">Línea e interno asignados</label>
              <select id="driver-bus" className="input" value={busId} disabled={!!editing} onChange={(event) => setBusId(event.target.value)} required>
                <option value="">Selecciona un bus</option>
                {editing && !buses.data?.some((bus) => bus.id === busId) && <option value={busId}>{editing.line} / {editing.internal}</option>}
                {buses.data?.map((bus) => {
                  const assigned = query.data?.some((driver) => driver.line === bus.line && driver.internal === bus.internal);
                  return <option key={bus.id} value={bus.id} disabled={!editing && assigned}>{bus.line} / {bus.internal}{assigned && !editing ? " · Ya asignado" : ""}</option>;
                })}
              </select>
            </div>
            <div>
              <label htmlFor="driver-pin" className="label">{editing ? "Nuevo PIN (opcional)" : "PIN de 4 dígitos"}</label>
              <input id="driver-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" maxLength={4}
                className="input" value={pin} onChange={(event) => setPin(event.target.value)} required={!editing} aria-describedby="driver-pin-help" />
              <p id="driver-pin-help" className="mt-1 text-xs text-muted">{editing ? "Déjalo vacío para conservar el PIN actual." : "Solo números; conserva los ceros iniciales."}</p>
            </div>
            {editing && <label htmlFor="driver-active" className="flex items-center gap-2 text-sm">
              <input id="driver-active" type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Conductor activo
            </label>}
          </fieldset>
          <Notice {...command} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={command.busy || (!editing && !buses.data?.length)}>
              {command.busy ? "Guardando…" : editing ? "Guardar conductor" : "Crear conductor"}
            </button>
            {editing && <button type="button" className="btn btn-outline" disabled={command.busy} onClick={clear}>Cancelar edición</button>}
          </div>
        </form>
      </Section>
    </div>
  );
}

export default function FleetPage() {
  const [tab, setTab] = useState<Tab>("lines");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <Page title="Flota" subtitle="Gestiona líneas, buses y asignaciones de conductores.">
      <div role="tablist" aria-label="Gestión de flota" className="flex gap-2 overflow-x-auto border-b border-line pb-3">
        {tabs.map((item, index) => (
          <button key={item.id} ref={(node) => { buttons.current[index] = node; }} type="button" role="tab"
            id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1}
            className={`btn shrink-0 ${tab === item.id ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(item.id)} onKeyDown={(event) => navigate(event, index)}>{item.label}</button>
        ))}
      </div>
      {tabs.map((item) => (
        <div key={item.id} role="tabpanel" id={`panel-${item.id}`} aria-labelledby={`tab-${item.id}`} hidden={tab !== item.id} tabIndex={0}>
          <div hidden={tab !== item.id}>
            {item.id === "lines" ? <LinesPanel /> : item.id === "buses" ? <BusesPanel /> : <DriversPanel />}
          </div>
        </div>
      ))}
    </Page>
  );
}
