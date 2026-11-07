"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CreditCard, QrCode, Wallet } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import OccBadge from "@/components/OccBadge";
import { CATEGORY_LABEL, FARES } from "@/lib/data";
import { useApp, type Ticket } from "@/lib/store";

type Method = "tarjeta" | "billetera";

const STATUS: Record<Ticket["status"], string> = {
  pagado: "Esperando validación",
  abordado: "Abordado",
  rechazado: "Rechazado",
  "pase-temporal": "Pase temporal",
};

export default function Pago() {
  const { profile, world, selectedBusId, selectBus, payTicket } = useApp();
  const [method, setMethod] = useState<Method>("tarjeta");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Ticket | null>(null);

  const category = profile?.category ?? "general";
  const fare = FARES[category];
  const active = world.buses.filter((b) => b.status === "activo");
  const bus = active.find((b) => b.id === selectedBusId) ?? null;

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bus) return setError("Elige la unidad en la que vas a viajar.");
    if (method === "tarjeta") {
      const digits = card.number.replace(/\s/g, "");
      if (!/^\d{16}$/.test(digits)) return setError("El número de tarjeta debe tener 16 dígitos.");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp)) return setError("El vencimiento debe tener formato MM/AA.");
      if (!/^\d{3,4}$/.test(card.cvc)) return setError("El CVC debe tener 3 o 4 dígitos.");
      if (card.name.trim().length < 3) return setError("Ingresa el nombre del titular.");
    }
    setBusy(true);
    setTimeout(() => {
      const res = payTicket(bus.id, method === "tarjeta" ? "Tarjeta" : "Billetera digital");
      setBusy(false);
      if (res.error) setError(res.error);
      else setDone(res.ticket!);
    }, 1200);
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 size={56} className="text-brand" />
        <h1 className="text-2xl font-semibold">Pago aprobado</h1>
        <p className="text-muted">
          Muestra tu carnet al chofer de la unidad {done.busId.replace("-", " / ")} para que valide tu identidad.
        </p>
        <div className="card w-full p-4 text-left text-sm">
          <Row k="Comprobante" v={done.id} />
          <Row k="Tarifa" v={`Bs ${done.fare.toFixed(2)} (${CATEGORY_LABEL[done.category]})`} />
          <Row k="Método" v={done.method} />
        </div>
        <div className="flex w-full gap-2">
          <Link href="/pasajero/carnet" className="btn btn-primary flex-1">Ver carnet</Link>
          <button className="btn btn-outline flex-1" onClick={() => setDone(null)}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={pay} className="flex flex-col gap-5">
        <h1 className="text-lg font-semibold">Pagar pasaje</h1>

        <div>
          <label htmlFor="bus" className="label">Unidad</label>
          <select id="bus" className="input" value={bus?.id ?? ""} onChange={(e) => selectBus(e.target.value || null)}>
            <option value="">Selecciona una unidad</option>
            {active.map((b) => (
              <option key={b.id} value={b.id} disabled={b.occupancy >= b.max}>
                Línea {b.line} · Interno {b.internal} ({b.occupancy}/{b.max}){b.occupancy >= b.max ? " - Lleno" : ""}
              </option>
            ))}
          </select>
          {bus && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <OccBadge occupancy={bus.occupancy} max={bus.max} />
              {bus.occupancy}/{bus.max} pasajeros a bordo
            </p>
          )}
        </div>

        <div>
          <span className="label">Método de pago</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["tarjeta", "Tarjeta", CreditCard],
                ["billetera", "Billetera digital", Wallet],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                type="button"
                key={m}
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                  method === m ? "border-brand bg-soft text-brand-dark" : "border-line hover:bg-soft"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === "tarjeta" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="num" className="label">Número de tarjeta</label>
              <input id="num" className="input" inputMode="numeric" placeholder="0000 0000 0000 0000" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} autoComplete="cc-number" />
            </div>
            <div className="col-span-2">
              <label htmlFor="holder" className="label">Titular</label>
              <input id="holder" className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} autoComplete="cc-name" />
            </div>
            <div>
              <label htmlFor="exp" className="label">Vencimiento</label>
              <input id="exp" className="input" placeholder="MM/AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} autoComplete="cc-exp" />
            </div>
            <div>
              <label htmlFor="cvc" className="label">CVC</label>
              <input id="cvc" className="input" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} autoComplete="cc-csc" />
            </div>
          </div>
        ) : (
          <div className="card flex items-center gap-4 bg-soft p-4 text-sm text-muted">
            <QrCode size={48} className="shrink-0 text-brand-dark" />
            Confirma el pago desde tu billetera digital. En esta versión el cobro es simulado.
          </div>
        )}

        <ErrorNote text={error} />
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Procesando pago..." : `Pagar Bs ${fare.toFixed(2)}`}
        </button>
      </form>

      <aside className="flex flex-col gap-4">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Tu tarifa</h2>
          <p className="text-3xl font-semibold">Bs {fare.toFixed(2)}</p>
          <p className="text-sm text-muted">
            Perfil {CATEGORY_LABEL[category].toLowerCase()} verificado. Se calcula sola; el chofer no cobra en mano.
          </p>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Mis pasajes</h2>
          {world.tickets.length === 0 && <p className="text-sm text-muted">Todavía no pagaste ningún pasaje.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {world.tickets.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {t.busId.replace("-", " / ")}
                  <span className="block text-xs text-muted">{new Date(t.at).toLocaleTimeString("es-BO")}</span>
                </span>
                <span className="text-right">
                  Bs {t.fare.toFixed(2)}
                  <span className="block text-xs text-muted">{STATUS[t.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
