"use client";

import { useState } from "react";
import { ArrowRightLeft, CheckCircle2, Siren, Ticket } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { RADIUS_KM } from "@/lib/data";
import { nearbyBuses, useApp } from "@/lib/store";

export default function Trasbordo() {
  const { profile, world, startEmergency, resolveEmergency, emergencyTransfer, restTransfer } = useApp();
  const [rescueId, setRescueId] = useState("");
  const [outId, setOutId] = useState("");
  const [credit, setCredit] = useState<"descanso" | "saliente">("descanso");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const bus = world.buses.find((b) => b.id === profile?.busId);
  if (!bus) return null;

  const emergency = bus.status === "emergencia";
  const rescuers = nearbyBuses(world.buses, bus.pos, RADIUS_KM, bus.id).filter(
    (n) => n.bus.max - n.bus.occupancy > 0,
  );
  const sameLine = world.buses.filter(
    (b) => b.id !== bus.id && b.line === bus.line && b.status === "activo" && b.max - b.occupancy >= bus.occupancy,
  );
  const myPasses = world.passes.filter((p) => p.fromBus === bus.id);
  const myLedger = world.ledger.filter((l) => l.fromBus === bus.id);

  function run(fn: () => string | null, success: string) {
    const err = fn();
    setError(err);
    setOk(err ? null : success);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <ErrorNote text={error} />
      {ok && (
        <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-brand-dark" role="status">
          <CheckCircle2 size={16} />
          {ok}
        </p>
      )}

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Siren size={20} className="text-danger" />
          Trasbordo de emergencia
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Avisa a las unidades cercanas y genera pases temporales para trasladar a los pasajeros sin cobros duplicados.
        </p>

        {!emergency ? (
          <button className="btn btn-danger btn-lg w-full" onClick={() => startEmergency(bus.id)}>
            <Siren size={22} />
            Activar emergencia
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-danger">
              Alerta enviada a {rescuers.length} unidades a menos de {RADIUS_KM} km. Pasajeros a bordo: {bus.occupancy}.
            </p>
            <div>
              <label htmlFor="rescue" className="label">Unidad de rescate</label>
              <select id="rescue" className="input h-14 text-base" value={rescueId} onChange={(e) => setRescueId(e.target.value)}>
                <option value="">Selecciona una unidad</option>
                {rescuers.map(({ bus: b, km }) => (
                  <option key={b.id} value={b.id}>
                    Línea {b.line} / {b.internal} · {km.toFixed(1)} km · {b.max - b.occupancy} libres
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={!rescueId || bus.occupancy === 0}
              onClick={() => run(() => emergencyTransfer(bus.id, rescueId), "Pasajeros trasladados con pases temporales.")}
            >
              <Ticket size={22} />
              Generar pases y trasladar
            </button>
            <button className="btn btn-outline" onClick={() => resolveEmergency(bus.id)}>
              Cerrar emergencia y volver al servicio
            </button>
          </div>
        )}

        {myPasses.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Pases temporales ({myPasses.length}), Bs 0.00, válidos 60 min</h3>
            <ul className="flex flex-wrap gap-2">
              {myPasses.map((p) => (
                <li key={p.id} className="chip bg-soft font-mono text-brand-dark">{p.code}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ArrowRightLeft size={20} className="text-brand" />
          Trasbordo por descanso
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Pasa tus pasajeros a una unidad saliente de la misma línea y registra a quién se acredita el pago.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="out" className="label">Unidad saliente (Línea {bus.line})</label>
            <select id="out" className="input h-14 text-base" value={outId} onChange={(e) => setOutId(e.target.value)}>
              <option value="">Selecciona una unidad</option>
              {sameLine.map((b) => (
                <option key={b.id} value={b.id}>
                  Interno {b.internal} · {b.max - b.occupancy} libres
                </option>
              ))}
            </select>
            {sameLine.length === 0 && (
              <p className="mt-1 text-xs text-muted">Ninguna unidad de tu línea tiene cupo para todos tus pasajeros.</p>
            )}
          </div>
          <fieldset>
            <legend className="label">Pago abonado se acredita a</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["descanso", "Unidad en descanso"],
                  ["saliente", "Unidad saliente"],
                ] as const
              ).map(([v, label]) => (
                <button
                  type="button"
                  key={v}
                  aria-pressed={credit === v}
                  onClick={() => setCredit(v)}
                  className={`rounded-lg border px-3 py-3 text-sm font-medium ${
                    credit === v ? "border-brand bg-soft text-brand-dark" : "border-line hover:bg-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="btn btn-primary btn-lg"
            disabled={!outId || bus.status !== "activo"}
            onClick={() => run(() => restTransfer(bus.id, outId, credit), "Trasbordo registrado. Tu unidad quedó en descanso.")}
          >
            Trasladar y entrar en descanso
          </button>
        </div>

        {myLedger.length > 0 && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {myLedger.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span>
                  {l.passengers} pasajeros hacia {l.toBus.replace("-", " / ")}
                  <span className="block text-xs text-muted">
                    Acreditado a {l.creditedTo === "descanso" ? "unidad en descanso" : "unidad saliente"}
                  </span>
                </span>
                <span className="font-semibold">Bs {l.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
