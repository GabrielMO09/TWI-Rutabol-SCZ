"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, CreditCard, Info, Receipt, Wallet } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { newKey, useFetch } from "@/lib/api";
import { CATEGORY_LABEL, FARES } from "@/lib/data";
import { nearbyBuses, useApp, type Ticket } from "@/lib/store";
import { PLAZA, RADIUS_KM } from "@/lib/data";

interface WalletInfo {
  cardNumber: string;
  balance: number;
  status: "activa" | "bloqueada";
}

export default function Pago() {
  const { profile, world, selectedBusId, selectBus, payTicket } = useApp();
  const { data: wallet, reload } = useFetch<WalletInfo>("/wallet/me");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Ticket | null>(null);
  // Misma clave en cada reintento del mismo pago: el backend nunca cobra dos veces.
  const key = useRef(newKey());

  const category = profile?.fareCategory ?? "general";
  const fare = FARES[category];
  const candidates = nearbyBuses(world.buses, PLAZA, RADIUS_KM).map((n) => n.bus);
  const bus = world.buses.find((b) => b.id === selectedBusId) ?? null;
  const pendingStudent = profile?.category !== "general" && category === "general";
  const low = wallet !== null && wallet.balance < fare;

  async function pay() {
    if (!bus) return setError("Elige la unidad en la que vas a viajar.");
    setBusy(true);
    setError(null);
    const res = await payTicket(bus.id, key.current);
    setBusy(false);
    if (res.error) return setError(res.error);
    setDone(res.ticket!);
    key.current = newKey();
    void reload();
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 size={56} className="text-brand" />
        <h1 className="text-2xl font-semibold">Pago aprobado</h1>
        <div className="card w-full p-4 text-left text-sm">
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <Receipt size={16} />
            Comprobante {done.receiptNo}
          </p>
          <dl className="grid grid-cols-2 gap-1">
            <dt className="text-muted">Unidad</dt>
            <dd>Línea {done.line ?? done.busId.split("-")[0]} / Interno {done.internal ?? done.busId.split("-")[1]}</dd>
            <dt className="text-muted">Categoría</dt>
            <dd>{CATEGORY_LABEL[done.category]}</dd>
            <dt className="text-muted">Importe</dt>
            <dd className="font-semibold">Bs {done.fare.toFixed(2)}</dd>
            <dt className="text-muted">Medio</dt>
            <dd>{done.method}</dd>
            <dt className="text-muted">Fecha</dt>
            <dd>{new Date(done.at).toLocaleString("es-BO")}</dd>
          </dl>
          {done.fareReason && <p className="mt-2 text-xs text-muted">{done.fareReason}</p>}
        </div>
        <p className="text-muted">Muestra tu código QR al chofer para que valide tu identidad.</p>
        <div className="flex gap-2">
          <Link href="/pasajero/carnet" className="btn btn-primary">Ver mi carnet</Link>
          <Link href="/pasajero/historial" className="btn btn-outline">Mis viajes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pagar pasaje</h1>

      <section className="card p-4" aria-labelledby="unidad">
        <h2 id="unidad" className="mb-2 font-semibold">1. Unidad</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">No hay unidades disponibles cerca. Revisa el mapa.</p>
        ) : (
          <select
            className="input"
            aria-label="Unidad en la que viajas"
            value={bus?.id ?? ""}
            onChange={(e) => selectBus(e.target.value || null)}
          >
            <option value="">Elige una unidad</option>
            {candidates.map((b) => (
              <option key={b.id} value={b.id} disabled={b.occupancy >= b.max}>
                Línea {b.line} · Interno {b.internal} ({b.occupancy}/{b.max}){b.occupancy >= b.max ? " - Lleno" : ""}
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="card p-4" aria-labelledby="medio">
        <h2 id="medio" className="mb-3 font-semibold">2. Credicard</h2>
        <div className="flex items-center gap-3 rounded-xl bg-brand p-4 text-white">
          <CreditCard size={28} />
          <div className="flex-1">
            <p className="font-mono text-sm">{wallet?.cardNumber ?? "Cargando..."}</p>
            <p className="text-xs">{wallet?.status === "bloqueada" ? "Tarjeta bloqueada" : "Tarjeta activa"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs">Saldo</p>
            <p className="text-xl font-bold tabular-nums">Bs {(wallet?.balance ?? 0).toFixed(2)}</p>
          </div>
        </div>
        {low && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
            <Wallet size={16} />
            Saldo insuficiente para este pasaje.
            <Link href="/pasajero/credicard" className="font-medium underline">Recargar</Link>
          </p>
        )}
      </section>

      <section className="card p-4" aria-live="polite">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Tarifa {CATEGORY_LABEL[category]}</p>
            <p className="text-3xl font-bold tabular-nums">Bs {fare.toFixed(2)}</p>
          </div>
          <span className="chip bg-soft text-brand-dark">Calculada por el servidor</span>
        </div>
        {pendingStudent && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-warn">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>
              Tu acreditación no está vigente, por eso se cobra la tarifa general.{" "}
              <Link href="/pasajero/acreditacion" className="font-medium underline">Ver mi acreditación</Link>
            </span>
          </p>
        )}
      </section>

      <ErrorNote text={error} />
      <button className="btn btn-primary btn-lg" onClick={pay} disabled={busy || !bus}>
        {busy ? "Procesando..." : `Pagar Bs ${fare.toFixed(2)}`}
      </button>
      <p className="text-center text-xs text-muted">
        Si la conexión se corta, vuelve a pulsar Pagar: un reintento no genera un segundo cobro.
      </p>
    </div>
  );
}
