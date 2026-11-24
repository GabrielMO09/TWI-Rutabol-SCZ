"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Ban, BusFront, CheckCircle2, IdCard, Info, Lock, Receipt, Wallet } from "lucide-react";
import { bs, dateTime, maskCard } from "@/components/pasajero/format";
import { EmptyState, ErrorState, LineBadge, Notice, Skeleton, StatusPill } from "@/components/pasajero/ui";
import { newKey, useFetch } from "@/lib/api";
import { CATEGORY_LABEL, FARES, PLAZA, RADIUS_KM } from "@/lib/data";
import { nearbyBuses, useApp, type Bus, type Ticket } from "@/lib/store";

interface WalletInfo {
  cardNumber: string;
  balance: number;
  status: "activa" | "bloqueada";
}

function BusOption({ bus, active, onPick }: { bus: Bus; active: boolean; onPick: () => void }) {
  const full = bus.occupancy >= bus.max;
  return (
    <button
      type="button"
      disabled={full}
      aria-pressed={active}
      onClick={onPick}
      className={`psj-card flex w-full items-center gap-3 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? "border-(--psj-green) bg-(--psj-green-soft)" : ""
      }`}
    >
      <LineBadge line={bus.line} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Línea {bus.line} · Interno {bus.internal}</span>
        <span className="block text-xs text-(--psj-muted-strong)">
          {bus.occupancy}/{bus.max} pasajeros{bus.direction ? ` · sentido ${bus.direction}` : ""}
        </span>
      </span>
      {full && <StatusPill tone="danger">Lleno</StatusPill>}
    </button>
  );
}

export default function Pago() {
  const { profile, world, selectedBusId, selectBus, payTicket } = useApp();
  const { data: wallet, error: walletError, reload } = useFetch<WalletInfo>("/wallet/me", 4000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Ticket | null>(null);
  const [changing, setChanging] = useState(false);
  // Misma clave en cada reintento del mismo pago: el backend nunca cobra dos veces.
  const key = useRef(newKey());

  const category = profile?.fareCategory ?? "general";
  const fare = FARES[category];
  const candidates = nearbyBuses(world.buses, PLAZA, RADIUS_KM).map((n) => n.bus);
  const bus = world.buses.find((b) => b.id === selectedBusId) ?? null;
  const full = !!bus && bus.occupancy >= bus.max;
  const pendingStudent = profile?.category !== "general" && category === "general";
  const blocked = wallet?.status === "bloqueada";
  const low = !!wallet && wallet.balance < fare;
  const after = wallet ? wallet.balance - fare : null;
  const canPay = !!bus && !full && !!wallet && !blocked && !low && !busy;

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
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-(--psj-green-soft) text-(--psj-green)">
          <CheckCircle2 size={36} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold">Pago aprobado</h1>
        <div className="psj-card psj-card-shadow w-full p-4 text-left text-sm">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <Receipt size={16} aria-hidden="true" />
            Comprobante {done.receiptNo ?? done.id}
          </p>
          <dl className="grid grid-cols-2 gap-y-2">
            <dt className="text-(--psj-muted-strong)">Unidad</dt>
            <dd className="text-right">Línea {done.line ?? done.busId.split("-")[0]} / Interno {done.internal ?? done.busId.split("-")[1]}</dd>
            <dt className="text-(--psj-muted-strong)">Categoría</dt>
            <dd className="text-right">{CATEGORY_LABEL[done.category]}</dd>
            <dt className="text-(--psj-muted-strong)">Importe</dt>
            <dd className="text-right font-semibold tabular-nums">{bs(done.fare)}</dd>
            <dt className="text-(--psj-muted-strong)">Medio</dt>
            <dd className="text-right">{done.method}</dd>
            <dt className="text-(--psj-muted-strong)">Fecha</dt>
            <dd className="text-right">{dateTime(done.at)}</dd>
          </dl>
          {done.fareReason && <p className="mt-3 text-xs text-(--psj-muted-strong)">{done.fareReason}</p>}
        </div>
        <p className="text-sm text-(--psj-muted-strong)">Muestra tu código QR al chofer para que valide tu identidad.</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link href="/pasajero/carnet" className="psj-btn psj-btn-primary flex-1">
            <IdCard size={18} aria-hidden="true" />
            Ver carnet y QR
          </Link>
          <Link href="/pasajero/historial" className="psj-btn psj-btn-outline flex-1">Mis viajes</Link>
        </div>
      </div>
    );
  }

  const showList = !bus || changing;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="sr-only">Pagar pasaje</h1>

      <section aria-labelledby="unidad" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="unidad" className="font-semibold">Unidad</h2>
          {bus && (
            <button type="button" className="psj-btn psj-btn-ghost min-h-11 px-2" onClick={() => setChanging((c) => !c)}>
              {changing ? "Listo" : "Cambiar"}
            </button>
          )}
        </div>
        {bus && !changing && <BusOption bus={bus} active onPick={() => undefined} />}
        {showList &&
          (candidates.length === 0 ? (
            <div className="psj-card">
              <EmptyState icon={BusFront} title="No hay unidades cerca">
                Revisa el <Link href="/pasajero" className="font-semibold underline">mapa</Link> para ver otras unidades.
              </EmptyState>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((b) => (
                <li key={b.id}>
                  <BusOption
                    bus={b}
                    active={b.id === bus?.id}
                    onPick={() => {
                      selectBus(b.id);
                      setChanging(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          ))}
        {full && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-(--psj-danger)">
            <Ban size={16} aria-hidden="true" />
            Esta unidad está llena. Elige otra.
          </p>
        )}
      </section>

      <section aria-labelledby="resumen" className="psj-card flex flex-col gap-4 p-4" aria-live="polite">
        <h2 id="resumen" className="font-semibold">Resumen</h2>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-(--psj-muted-strong)">Tarifa {CATEGORY_LABEL[category]}</p>
            <p className="text-3xl font-bold tabular-nums">{bs(fare)}</p>
          </div>
          <StatusPill tone={category === "general" ? "neutral" : "success"}>
            {category === "general" ? "Sin beneficio" : "Beneficio estudiantil vigente"}
          </StatusPill>
        </div>
        <p className="text-xs text-(--psj-muted-strong)">El servidor calcula la tarifa definitiva al cobrar.</p>

        {pendingStudent && (
          <p className="flex items-start gap-2 rounded-lg bg-(--psj-warn-soft) p-3 text-sm text-[#92400e]">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>
              Tu acreditación no está vigente, por eso se cobra la tarifa general.{" "}
              <Link href="/pasajero/acreditacion" className="font-semibold underline">Ver mi acreditación</Link>
            </span>
          </p>
        )}

        <div className="rounded-lg bg-(--psj-bg) p-3 text-sm">
          {wallet ? (
            <dl className="grid grid-cols-2 gap-y-1">
              <dt className="flex items-center gap-2 text-(--psj-muted-strong)">
                <Wallet size={14} aria-hidden="true" />
                Credicard
              </dt>
              <dd className="text-right font-mono text-xs">{maskCard(wallet.cardNumber)}</dd>
              <dt className="text-(--psj-muted-strong)">Saldo disponible</dt>
              <dd className="text-right font-semibold tabular-nums">{bs(wallet.balance)}</dd>
              <dt className="text-(--psj-muted-strong)">Saldo después del pago</dt>
              <dd className={`text-right font-semibold tabular-nums ${after! < 0 ? "text-(--psj-danger)" : ""}`}>{bs(after!)}</dd>
            </dl>
          ) : walletError ? (
            <ErrorState message="No pudimos cargar tu saldo. Revisa tu conexión." onRetry={() => void reload()} />
          ) : (
            <div className="flex flex-col gap-2" aria-busy="true">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>

        {blocked && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-(--psj-danger)">
            <Lock size={16} aria-hidden="true" />
            Tu tarjeta está bloqueada.{" "}
            <Link href="/pasajero/credicard" className="underline">Desbloquear</Link>
          </p>
        )}
        {low && !blocked && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-(--psj-danger)">
            <Wallet size={16} aria-hidden="true" />
            Saldo insuficiente para este pasaje.{" "}
            <Link href="/pasajero/credicard" className="underline">Recargar</Link>
          </p>
        )}
      </section>

      {error && (
        <div className="flex flex-col gap-1">
          <ErrorState message={error} />
          <p className="text-xs text-(--psj-muted-strong)">
            Si la conexión se cortó, vuelve a pulsar Pagar: un reintento no genera un segundo cobro.
          </p>
        </div>
      )}
      {!bus && !error && <Notice tone="warn">Elige una unidad para continuar.</Notice>}

      <div className="sticky bottom-[calc(var(--psj-nav-h)+env(safe-area-inset-bottom))] z-10 -mx-4 bg-(--psj-bg) px-4 py-2 md:static md:mx-0 md:p-0">
        <button type="button" className="psj-btn psj-btn-primary h-14 w-full text-base " onClick={() => void pay()} disabled={!canPay}>
          {busy ? "Procesando..." : `Pagar ${bs(fare)}`}
        </button>
      </div>
    </div>
  );
}
