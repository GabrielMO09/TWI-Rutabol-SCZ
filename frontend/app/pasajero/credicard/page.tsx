"use client";

import { useRef, useState } from "react";
import { Ban, CheckCircle2, Clock, CreditCard, Lock, LockOpen, Plus, XCircle } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { act, newKey, useFetch } from "@/lib/api";

type MovType = "recarga" | "pasaje" | "ajuste" | "devolucion";
interface Movement {
  id: string;
  at: number;
  type: MovType;
  amount: number;
  status: "confirmado" | "pendiente" | "rechazado";
  ref: string;
  balanceAfter: number;
}
interface Wallet {
  cardNumber: string;
  balance: number;
  status: "activa" | "bloqueada";
  physicalLinked?: string;
  movements: Movement[];
}
interface Recharge {
  id: string;
  at: number;
  amount: number;
  method: string;
  status: "pendiente" | "confirmada" | "fallida";
  note?: string;
}

const MOV_LABEL: Record<MovType, string> = {
  recarga: "Recarga",
  pasaje: "Pasaje",
  ajuste: "Ajuste",
  devolucion: "Devolución",
};
const METHODS = [
  { id: "qr", label: "QR bancario", help: "Escanea el QR desde la app de tu banco." },
  { id: "transferencia", label: "Transferencia", help: "Transfiere al comercio RUTABOL-SCZ y confirma." },
  { id: "tarjeta", label: "Tarjeta de débito", help: "Pago con tarjeta en la pasarela del proveedor." },
] as const;

export default function Credicard() {
  const { data: wallet, loading, error, reload } = useFetch<Wallet>("/wallet/me", 4000);
  const { data: recharges, reload: reloadRecharges } = useFetch<Recharge[]>("/wallet/recharges", 4000);
  const [amount, setAmount] = useState("20");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("qr");
  const [physical, setPhysical] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // La clave se conserva mientras no se confirme el envío: reintentar no duplica la recarga.
  const key = useRef(newKey());

  async function recharge(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1 || n > 500) return setMsg("El monto debe estar entre Bs 1 y Bs 500.");
    setBusy(true);
    setMsg(null);
    const err = await act("/wallet/recharge", "POST", { amount: n, method, idempotencyKey: key.current });
    setBusy(false);
    if (err) return setMsg(err);
    key.current = newKey();
    setOk("Recarga solicitada. Está pendiente de confirmación del proveedor.");
    void reload();
    void reloadRecharges();
  }

  async function simple(path: string, body?: unknown, success?: string) {
    const err = await act(path, "POST", body);
    setMsg(err);
    setOk(err ? null : (success ?? null));
    void reload();
  }

  if (loading) return <p className="text-sm text-muted">Cargando tu Credicard...</p>;
  if (error || !wallet) return <ErrorNote text={error ?? "No se pudo cargar tu Credicard."} />;
  const blocked = wallet.status === "bloqueada";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Mi Credicard</h1>

      <section className="rounded-2xl bg-brand p-5 text-white" aria-label="Tarjeta virtual">
        <div className="flex items-start justify-between">
          <CreditCard size={32} />
          <span className="chip bg-white/20 text-white">
            {blocked ? <Lock size={12} /> : <CheckCircle2 size={12} />}
            {blocked ? "Bloqueada" : "Activa"}
          </span>
        </div>
        <p className="mt-6 font-mono text-lg tracking-wider">{wallet.cardNumber}</p>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-xs">
            {wallet.physicalLinked ? `Tarjeta física vinculada (…${wallet.physicalLinked})` : "Sin tarjeta física"}
          </span>
          <span className="text-right">
            <span className="block text-xs">Saldo disponible</span>
            <span className="text-3xl font-bold tabular-nums">Bs {wallet.balance.toFixed(2)}</span>
          </span>
        </div>
      </section>

      <ErrorNote text={msg} />
      {ok && <p role="status" className="rounded-lg bg-soft px-3 py-2 text-sm text-brand-dark">{ok}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={recharge} className="card flex flex-col gap-3 p-4" aria-labelledby="rec-h">
          <h2 id="rec-h" className="font-semibold">Recargar saldo</h2>
          <div>
            <label htmlFor="amt" className="label">Monto (Bs)</label>
            <input id="amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <fieldset>
            <legend className="label">Medio de pago</legend>
            <div className="flex flex-col gap-2">
              {METHODS.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${method === m.id ? "border-brand bg-soft" : "border-line"}`}>
                  <input type="radio" name="method" className="mt-1 accent-[var(--g600)]" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <span>
                    <span className="block font-medium">{m.label}</span>
                    <span className="block text-xs text-muted">{m.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary" disabled={busy || blocked}>
            <Plus size={16} />
            {busy ? "Enviando..." : "Recargar"}
          </button>
          <p className="text-xs text-muted">Proveedor simulado: la recarga se confirma en unos segundos.</p>
        </form>

        <section className="card flex flex-col gap-3 p-4" aria-labelledby="gest-h">
          <h2 id="gest-h" className="font-semibold">Gestión de la tarjeta</h2>
          {blocked ? (
            <button className="btn btn-outline" onClick={() => simple("/wallet/unblock", undefined, "Tarjeta desbloqueada.")}>
              <LockOpen size={16} />
              Desbloquear tarjeta
            </button>
          ) : (
            <button
              className="btn btn-outline border-danger text-danger"
              onClick={() => window.confirm("¿Bloquear tu Credicard? No podrás pagar hasta desbloquearla.") && simple("/wallet/block", undefined, "Tarjeta bloqueada.")}
            >
              <Ban size={16} />
              Bloquear tarjeta
            </button>
          )}
          <div>
            <label htmlFor="phys" className="label">Vincular tarjeta física (opcional)</label>
            <input id="phys" className="input" inputMode="numeric" maxLength={16} placeholder="16 dígitos" value={physical} onChange={(e) => setPhysical(e.target.value.replace(/\D/g, ""))} />
          </div>
          <button
            className="btn btn-outline"
            disabled={physical.length !== 16}
            onClick={() => simple("/wallet/link-physical", { cardNumber: physical }, "Tarjeta física vinculada.").then(() => setPhysical(""))}
          >
            Vincular
          </button>
        </section>
      </div>

      <section className="card p-4" aria-labelledby="pend-h">
        <h2 id="pend-h" className="mb-2 font-semibold">Recargas</h2>
        {!recharges || recharges.length === 0 ? (
          <p className="text-sm text-muted">Aún no solicitaste recargas.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {recharges.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  Bs {r.amount.toFixed(2)} · {r.method} · {new Date(r.at).toLocaleString("es-BO")}
                  {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                </span>
                <span className={`chip ${r.status === "confirmada" ? "bg-green-100 text-green-800" : r.status === "fallida" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                  {r.status === "confirmada" ? <CheckCircle2 size={12} /> : r.status === "fallida" ? <XCircle size={12} /> : <Clock size={12} />}
                  {r.status === "confirmada" ? "Confirmada" : r.status === "fallida" ? "Fallida" : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4" aria-labelledby="mov-h">
        <h2 id="mov-h" className="mb-2 font-semibold">Movimientos</h2>
        {wallet.movements.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tienes movimientos.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de movimientos">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-3 font-medium">Fecha</th>
                  <th className="py-1 pr-3 font-medium">Detalle</th>
                  <th className="py-1 pr-3 text-right font-medium">Importe</th>
                  <th className="py-1 pr-3 text-right font-medium">Saldo</th>
                  <th className="py-1 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {wallet.movements.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-2 pr-3">{new Date(m.at).toLocaleString("es-BO")}</td>
                    <td className="py-2 pr-3">{MOV_LABEL[m.type]} <span className="text-xs text-muted">{m.ref}</span></td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${m.amount < 0 ? "text-danger" : "text-brand"}`}>
                      {m.amount < 0 ? "-" : "+"}Bs {Math.abs(m.amount).toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">Bs {m.balanceAfter.toFixed(2)}</td>
                    <td className="py-2 capitalize">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
