"use client";

import { useState } from "react";
import { Ban, Check, UserRound, X } from "lucide-react";
import { EmptyState } from "@/components/pasajero/ui";
import { CashPanel, PassRedeem, QrVerifier } from "@/components/DriverValidation";
import { CATEGORY_LABEL } from "@/lib/data";
import { useApp } from "@/lib/store";

export default function Validacion() {
  const { profile, world, validateBoarding } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const bus = world.buses.find((b) => b.id === profile?.busId);
  if (!bus) return null;

  const reqs = world.reqs.filter((r) => r.busId === bus.id);
  const full = bus.occupancy >= bus.max;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 lg:grid lg:max-w-[1280px] lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-6">
      <div className="flex items-end justify-between lg:col-span-2">
        <div>
          <h1 className="text-lg font-semibold">Validación rápida</h1>
          <p className="text-sm text-(--psj-muted-strong)">Compara la foto con la persona que sube.</p>
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {bus.occupancy}/{bus.max}
        </p>
      </div>

      <dl className="hidden gap-6 lg:col-span-2 lg:grid lg:grid-cols-2">
        <div className="psj-card flex items-center justify-between p-6">
          <dt className="text-sm text-(--psj-muted-strong)">Validaciones pendientes</dt>
          <dd className="text-3xl font-bold tabular-nums">{reqs.length}</dd>
        </div>
        <div className="psj-card flex items-center justify-between p-6">
          <dt className="text-sm text-(--psj-muted-strong)">Ocupación</dt>
          <dd className="text-3xl font-bold tabular-nums">
            {bus.occupancy}<span className="text-lg font-semibold text-(--psj-muted-strong)"> / {bus.max}</span>
          </dd>
        </div>
      </dl>

      {/* "contents" en móvil: el orden vertical original no cambia. */}
      <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-4">
      {full && (
        <div className="psj-card flex items-center gap-3 border-(--psj-danger) bg-(--psj-danger-soft) p-4 font-semibold text-(--psj-danger)" role="alert">
          <Ban size={24} className="shrink-0" />
          Unidad llena: admisión bloqueada.
        </div>
      )}
      {msg && <p className="text-sm text-(--psj-danger)" role="alert">{msg}</p>}

      {reqs.length === 0 && (
        <div className="psj-card"><EmptyState icon={UserRound} title="No hay pasajeros esperando validación">Cuando un pasajero pague, aparecerá aquí para que lo confirmes.</EmptyState></div>
      )}

      <ul className="flex flex-col gap-3">
        {reqs.map((r) => (
          <li key={r.id} className="psj-card p-4 lg:flex lg:items-center lg:gap-6 lg:p-6">
            <div className="flex gap-4 lg:min-w-0 lg:flex-1">
              <div className="flex h-24 w-24 shrink-0 sm:h-28 sm:w-28 items-center justify-center overflow-hidden rounded-xl border border-(--psj-line) bg-(--psj-green-soft) text-(--psj-muted-strong)">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt={`Fotografía de ${r.name}`} className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={48} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold">{r.name}</p>
                <p className="break-all text-sm text-(--psj-muted-strong)">{r.code}</p>
                <p className="mt-1 text-sm">
                  {CATEGORY_LABEL[r.category]} · Pagó Bs {r.fare.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-0 lg:w-72 lg:shrink-0">
              <button
                className="psj-btn psj-btn-primary psj-btn-lg"
                disabled={full}
                onClick={() => validateBoarding(r.id, true).then(setMsg)}
              >
                <Check size={22} />
                Confirmar
              </button>
              <button
                className="psj-btn psj-btn-danger-outline psj-btn-lg"
                onClick={() => validateBoarding(r.id, false).then(setMsg)}
              >
                <X size={22} />
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      </div>
      <div className="contents lg:col-start-2 lg:row-start-3 lg:flex lg:flex-col lg:gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 lg:gap-6">
          <QrVerifier />
          <CashPanel bus={bus} />
        </div>
        <PassRedeem />
      </div>
    </div>
  );
}
