"use client";

import { useRef, useState } from "react";
import {
  ArrowDownToLine, Ban, BusFront, CheckCircle2, Clock, Lock, LockOpen, Plus, Settings2,
  SlidersHorizontal, Undo2, XCircle, type LucideIcon,
} from "lucide-react";
import { bs, dateTime, maskCard } from "@/components/pasajero/format";
import { EmptyState, ErrorState, Notice, Sheet, Skeleton, StatusPill } from "@/components/pasajero/ui";
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

const MOV: Record<MovType, { label: string; icon: LucideIcon }> = {
  recarga: { label: "Recarga", icon: ArrowDownToLine },
  pasaje: { label: "Pasaje", icon: BusFront },
  ajuste: { label: "Ajuste", icon: SlidersHorizontal },
  devolucion: { label: "Devolución", icon: Undo2 },
};
const METHODS = [
  { id: "qr", label: "QR bancario", help: "Escanea el QR desde la app de tu banco." },
  { id: "transferencia", label: "Transferencia", help: "Transfiere al comercio RUTABOL-SCZ y confirma." },
  { id: "tarjeta", label: "Tarjeta de débito", help: "Pago con tarjeta en la pasarela del proveedor." },
] as const;
const QUICK = [5, 10, 20, 50];
const RECHARGE_PILL = {
  confirmada: { tone: "success", label: "Confirmada", icon: CheckCircle2 },
  fallida: { tone: "danger", label: "Fallida", icon: XCircle },
  pendiente: { tone: "warn", label: "Pendiente", icon: Clock },
} as const;

export default function Credicard() {
  const { data: wallet, loading, error, reload } = useFetch<Wallet>("/wallet/me", 4000);
  const { data: recharges, reload: reloadRecharges } = useFetch<Recharge[]>("/wallet/recharges", 4000);
  const [tab, setTab] = useState<"mov" | "rec">("mov");
  const [sheet, setSheet] = useState<null | "recharge" | "manage">(null);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [amount, setAmount] = useState("20");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("qr");
  const [physical, setPhysical] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // La clave se conserva mientras no se confirme el envío: reintentar no duplica la recarga.
  const key = useRef(newKey());

  const value = Number(amount);
  const validAmount = Number.isFinite(value) && value >= 1 && value <= 500;

  function closeSheet() {
    setSheet(null);
    setStep("form");
    setConfirmBlock(false);
    setMsg(null);
  }

  function toSummary() {
    if (!validAmount) return setMsg("El monto debe estar entre Bs 1 y Bs 500.");
    setMsg(null);
    setStep("summary");
  }

  async function recharge() {
    if (!validAmount) return setMsg("El monto debe estar entre Bs 1 y Bs 500.");
    setBusy(true);
    setMsg(null);
    const err = await act("/wallet/recharge", "POST", { amount: value, method, idempotencyKey: key.current });
    setBusy(false);
    if (err) return setMsg(err);
    key.current = newKey();
    closeSheet();
    setOk("Recarga solicitada. Está pendiente de confirmación del proveedor.");
    void reload();
    void reloadRecharges();
  }

  async function simple(path: string, body?: unknown, success?: string) {
    setBusy(true);
    const err = await act(path, "POST", body);
    setBusy(false);
    if (err) return setMsg(err);
    setMsg(null);
    setOk(success ?? null);
    closeSheet();
    void reload();
  }

  if (loading && !wallet) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando tu Credicard">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!wallet) return <ErrorState message={error ?? "No pudimos cargar tu Credicard."} onRetry={() => void reload()} />;

  const blocked = wallet.status === "bloqueada";
  const method_ = METHODS.find((m) => m.id === method)!;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Mi Credicard</h1>

      <section aria-label="Saldo y tarjeta" className="rounded-2xl bg-(--psj-green-dark) p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/80">Saldo disponible</p>
            <p className="text-4xl font-bold tabular-nums">{bs(wallet.balance)}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {blocked ? <Lock size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
            {blocked ? "Bloqueada" : "Activa"}
          </span>
        </div>
        <p className="mt-6 font-mono text-base tracking-wider" aria-label={`Tarjeta terminada en ${wallet.cardNumber.slice(-4)}`}>
          {maskCard(wallet.cardNumber)}
        </p>
        <p className="mt-1 text-xs text-white/80">
          {wallet.physicalLinked ? `Tarjeta física vinculada (…${wallet.physicalLinked})` : "Sin tarjeta física"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="psj-btn bg-white text-(--psj-green-dark) hover:bg-(--psj-green-soft)"
            disabled={blocked}
            onClick={() => setSheet("recharge")}
          >
            <Plus size={18} aria-hidden="true" />
            Recargar
          </button>
          <button
            type="button"
            className="psj-btn border border-white/40 text-white hover:bg-white/10"
            onClick={() => setSheet("manage")}
          >
            <Settings2 size={18} aria-hidden="true" />
            Gestionar tarjeta
          </button>
        </div>
      </section>

      {error && <Notice tone="warn">No pudimos actualizar tu saldo. Mostramos el último dato recibido.</Notice>}
      {blocked && <Notice tone="warn">Tu tarjeta está bloqueada: no puedes pagar ni recargar hasta desbloquearla.</Notice>}
      {ok && <Notice>{ok}</Notice>}

      <section className="psj-card overflow-hidden" aria-label="Actividad">
        <div role="tablist" aria-label="Actividad de la tarjeta" className="grid grid-cols-2 border-b border-(--psj-line)">
          {([["mov", "Movimientos"], ["rec", "Recargas"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`min-h-12 border-b-2 text-sm font-semibold transition-colors ${
                tab === id ? "border-(--psj-green) text-(--psj-green-dark)" : "border-transparent text-(--psj-muted-strong)"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "mov" ? (
          <div role="tabpanel" id="panel-mov" aria-labelledby="tab-mov">
            {wallet.movements.length === 0 ? (
              <EmptyState icon={ArrowDownToLine} title="Todavía no tienes movimientos">
                Recarga saldo para empezar a pagar tus pasajes.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-(--psj-line)">
                {wallet.movements.map((m) => {
                  const { label, icon: Icon } = MOV[m.type];
                  const negative = m.amount < 0;
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--psj-green-soft) text-(--psj-green)">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {label}
                          {m.status === "pendiente" && <StatusPill tone="warn">Pendiente</StatusPill>}
                          {m.status === "rechazado" && <StatusPill tone="danger">Rechazado</StatusPill>}
                        </p>
                        <p className="truncate text-xs text-(--psj-muted-strong)">{dateTime(m.at)} · {m.ref}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${negative ? "text-(--psj-danger)" : "text-(--psj-green)"}`}>
                          {negative ? "-" : "+"}{bs(Math.abs(m.amount))}
                        </p>
                        <p className="text-xs text-(--psj-muted-strong) tabular-nums">Saldo {bs(m.balanceAfter)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div role="tabpanel" id="panel-rec" aria-labelledby="tab-rec">
            {!recharges || recharges.length === 0 ? (
              <EmptyState icon={Clock} title="Aún no solicitaste recargas">
                Cuando recargues, verás aquí si está pendiente, confirmada o fallida.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-(--psj-line)">
                {recharges.map((r) => {
                  const pill = RECHARGE_PILL[r.status];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums">{bs(r.amount)}</p>
                        <p className="truncate text-xs text-(--psj-muted-strong)">
                          {r.method} · {dateTime(r.at)}
                        </p>
                        {r.note && <p className="text-xs text-(--psj-muted-strong)">{r.note}</p>}
                      </div>
                      <StatusPill tone={pill.tone}>
                        <pill.icon size={12} aria-hidden="true" />
                        {pill.label}
                      </StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <Sheet open={sheet === "recharge"} onClose={closeSheet} title={step === "form" ? "Recargar saldo" : "Confirma tu recarga"}>
        {step === "form" ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              toSummary();
            }}
          >
            <div>
              <span className="psj-label">Monto rápido</span>
              <div className="grid grid-cols-4 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={value === q}
                    onClick={() => setAmount(String(q))}
                    className={`psj-btn border px-0 ${value === q ? "border-(--psj-green) bg-(--psj-green-soft) text-(--psj-green-dark)" : "border-(--psj-line)"}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="amt" className="psj-label">Otro monto (Bs 1 a Bs 500)</label>
              <input
                id="amt"
                className="psj-input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                aria-invalid={!validAmount}
              />
            </div>
            <fieldset>
              <legend className="psj-label">Medio de pago</legend>
              <div className="flex flex-col gap-2">
                {METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      method === m.id ? "border-(--psj-green) bg-(--psj-green-soft)" : "border-(--psj-line)"
                    }`}
                  >
                    <input type="radio" name="method" className="mt-0.5" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span>
                      <span className="block font-medium">{m.label}</span>
                      <span className="block text-xs text-(--psj-muted-strong)">{m.help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {msg && <ErrorState message={msg} />}
            <button type="submit" className="psj-btn psj-btn-primary w-full">Continuar</button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-(--psj-muted-strong)">Monto</dt>
              <dd className="text-right font-semibold tabular-nums">{bs(value)}</dd>
              <dt className="text-(--psj-muted-strong)">Medio de pago</dt>
              <dd className="text-right">{method_.label}</dd>
              <dt className="text-(--psj-muted-strong)">Saldo actual</dt>
              <dd className="text-right tabular-nums">{bs(wallet.balance)}</dd>
              <dt className="text-(--psj-muted-strong)">Saldo estimado al confirmarse</dt>
              <dd className="text-right font-semibold tabular-nums">{bs(wallet.balance + value)}</dd>
            </dl>
            <Notice tone="warn">Pago simulado: no se mueve dinero real. El proveedor de prueba confirma en unos segundos.</Notice>
            {msg && <ErrorState message={msg} />}
            <div className="flex gap-2">
              <button type="button" className="psj-btn psj-btn-outline flex-1" disabled={busy} onClick={() => setStep("form")}>Volver</button>
              <button type="button" className="psj-btn psj-btn-primary flex-1" disabled={busy} onClick={() => void recharge()}>
                {busy ? "Enviando..." : "Confirmar recarga"}
              </button>
            </div>
            <p className="text-center text-xs text-(--psj-muted-strong)">
              Si la conexión se corta, vuelve a confirmar: no se duplica la recarga.
            </p>
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === "manage"} onClose={closeSheet} title="Gestionar tarjeta">
        <div className="flex flex-col gap-5">
          {msg && <ErrorState message={msg} />}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Estado de la tarjeta</p>
            {blocked ? (
              <button type="button" className="psj-btn psj-btn-outline" disabled={busy} onClick={() => void simple("/wallet/unblock", undefined, "Tarjeta desbloqueada.")}>
                <LockOpen size={16} aria-hidden="true" />
                Desbloquear tarjeta
              </button>
            ) : confirmBlock ? (
              <div className="flex flex-col gap-2 rounded-lg bg-(--psj-danger-soft) p-3 text-sm">
                <p>¿Bloquear tu Credicard? No podrás pagar hasta desbloquearla.</p>
                <div className="flex gap-2">
                  <button type="button" className="psj-btn psj-btn-outline flex-1" onClick={() => setConfirmBlock(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="psj-btn flex-1 bg-(--psj-danger) text-white hover:bg-[#b91c1c]"
                    disabled={busy}
                    onClick={() => void simple("/wallet/block", undefined, "Tarjeta bloqueada.")}
                  >
                    Sí, bloquear
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="psj-btn psj-btn-outline border-(--psj-danger) text-(--psj-danger)" onClick={() => setConfirmBlock(true)}>
                <Ban size={16} aria-hidden="true" />
                Bloquear tarjeta
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="phys" className="text-sm font-semibold">Vincular tarjeta física (opcional)</label>
            <input
              id="phys"
              className="psj-input"
              inputMode="numeric"
              maxLength={16}
              placeholder="16 dígitos"
              value={physical}
              onChange={(e) => setPhysical(e.target.value.replace(/\D/g, ""))}
            />
            <button
              type="button"
              className="psj-btn psj-btn-outline"
              disabled={physical.length !== 16 || busy}
              onClick={() => void simple("/wallet/link-physical", { cardNumber: physical }, "Tarjeta física vinculada.").then(() => setPhysical(""))}
            >
              Vincular
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
