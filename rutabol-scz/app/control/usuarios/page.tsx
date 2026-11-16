"use client";

import { useState, type FormEvent } from "react";
import { useFetch } from "@/lib/api";
import type { ControlUser } from "@/components/control/types";
import {
  Empty, Notice, Page, QueryState, Section, Status, Table, date, money, text, useCommand,
} from "@/components/control/ui";

function WalletAdjustment({ user, reload, close }: {
  user: ControlUser;
  reload: () => Promise<void>;
  close: () => void;
}) {
  const command = useCommand();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    command.setError(null);
    const numeric = Number(amount);
    if (!amount.trim() || !Number.isFinite(numeric) || numeric === 0 || Math.abs(numeric * 100 - Math.round(numeric * 100)) > 0.000001) {
      command.setError("Ingresa un importe distinto de cero con hasta dos decimales.");
      return;
    }
    if (reason.trim().length < 5) {
      command.setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (!window.confirm(`¿${numeric > 0 ? "Acreditar" : "Descontar"} ${money(Math.abs(numeric))} ${numeric > 0 ? "a" : "de"} la cuenta de ${user.name}?\nMotivo: ${reason.trim()}`)) return;
    if (await command.run("/control/wallet/adjust", "POST", { userId: user.userId, amount: numeric, reason: reason.trim() }, "Ajuste de saldo registrado.")) {
      setAmount("");
      setReason("");
      await reload();
    }
  }

  return (
    <Section title={`Ajustar saldo: ${user.name}`}>
      <p className="mb-4 text-sm text-muted">{user.userId} · Saldo informado: {money(user.balance ?? 0)}</p>
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={command.busy} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Ajuste de saldo</legend>
          <div>
            <label htmlFor="wallet-amount" className="label">Importe en Bs</label>
            <input id="wallet-amount" type="number" step="0.01" className="input" value={amount}
              onChange={(event) => setAmount(event.target.value)} required aria-describedby="wallet-help" />
            <p id="wallet-help" className="mt-1 text-xs text-muted">Positivo para acreditar; negativo para descontar.</p>
          </div>
          <div>
            <label htmlFor="wallet-reason" className="label">Motivo obligatorio</label>
            <textarea id="wallet-reason" className="input min-h-24 py-2" minLength={5} required value={reason}
              onChange={(event) => setReason(event.target.value)} />
          </div>
        </fieldset>
        <Notice {...command} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={command.busy}>{command.busy ? "Guardando…" : "Confirmar ajuste de saldo"}</button>
          <button type="button" className="btn btn-outline" disabled={command.busy} onClick={close}>Cerrar ajuste</button>
        </div>
      </form>
    </Section>
  );
}

export default function UsersPage() {
  const query = useFetch<ControlUser[]>("/control/users");
  const command = useCommand();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = query.data?.find((user) => user.userId === selectedId);
  const needle = search.trim().toLocaleLowerCase("es-BO");
  const users = (query.data ?? []).filter((user) =>
    (!role || user.role === role)
    && (!needle || `${user.name} ${user.userId} ${user.codeMasked}`.toLocaleLowerCase("es-BO").includes(needle)),
  );

  async function toggle(user: ControlUser) {
    const status = user.status === "activo" ? "suspendido" : "activo";
    if (!window.confirm(`¿${status === "suspendido" ? "Suspender" : "Reactivar"} la cuenta de ${user.name} (${user.userId})?`)) return;
    if (await command.run(`/control/users/${encodeURIComponent(user.userId)}/status`, "POST", { status }, `Cuenta ${status === "activo" ? "reactivada" : "suspendida"}.`)) await query.reload();
  }

  return (
    <Page title="Usuarios" subtitle="Consulta cuentas, gestiona su estado y registra ajustes de saldo.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="user-search" className="label">Buscar por nombre, identificador o código</label>
          <input id="user-search" type="search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div>
          <label htmlFor="user-role" className="label">Rol</label>
          <select id="user-role" className="input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Todos los roles</option>
            <option value="pasajero">Pasajero</option><option value="chofer">Conductor</option><option value="control">Centro de Control</option>
          </select>
        </div>
      </div>
      <QueryState {...query} />
      <Notice {...command} />
      {!query.loading && !users.length ? <Empty>No hay usuarios para esta búsqueda.</Empty> : !!users.length && (
        <Table caption="Usuarios del sistema" headers={["Usuario", "Rol", "Categoría", "Código", "Estado", "Acreditación", "Saldo", "Registro", "Acciones"]}>
          {users.map((user) => (
            <tr key={user.userId}>
              <td><p className="font-medium">{user.name}</p><p className="break-all text-xs text-muted">{user.userId}</p></td>
              <td>{text(user.role)}</td><td>{user.category ? text(user.category) : "No corresponde"}</td><td>{user.codeMasked || "Sin código"}</td>
              <td><Status value={user.status} /></td>
              <td>{user.accreditationStatus ? <Status value={user.accreditationStatus} /> : "Sin acreditación"}</td>
              <td className="whitespace-nowrap">{user.balance !== undefined ? money(user.balance) : "No corresponde"}</td>
              <td className="whitespace-nowrap">{date(user.createdAt)}</td>
              <td><div className="flex flex-wrap gap-2">
                <button type="button" className={`btn ${user.status === "activo" ? "btn-danger" : "btn-outline"}`} disabled={command.busy}
                  onClick={() => void toggle(user)} aria-label={`${user.status === "activo" ? "Suspender" : "Reactivar"} a ${user.name}`}>
                  {user.status === "activo" ? "Suspender" : "Reactivar"}
                </button>
                {user.role === "pasajero" && user.balance !== undefined && (
                  <button type="button" className="btn btn-outline" disabled={command.busy} onClick={() => setSelectedId(user.userId)}
                    aria-label={`Ajustar saldo de ${user.name}`}>Ajustar saldo</button>
                )}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {selected && <WalletAdjustment key={selected.userId} user={selected} reload={query.reload} close={() => setSelectedId(null)} />}
    </Page>
  );
}
