"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Minus, PauseCircle, Play, Plus, ScanFace, Siren, UserMinus, X } from "lucide-react";
import OccBadge from "@/components/OccBadge";
import { RADIUS_KM, haversineKm, occState } from "@/lib/data";
import { useApp } from "@/lib/store";

const BAR: Record<string, string> = {
  disponible: "bg-brand",
  moderado: "bg-lime-600",
  "casi-lleno": "bg-warn",
  lleno: "bg-danger",
};

export default function PanelChofer() {
  const { profile, world, registerDisembark, setMax, resumeService, dismissAlert } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const bus = world.buses.find((b) => b.id === profile?.busId);
  if (!bus) return null;

  const pending = world.reqs.filter((r) => r.busId === bus.id).length;
  const state = occState(bus.occupancy, bus.max);
  const full = state === "lleno";
  const alerts = world.alerts.filter(
    (a) => a.busId !== bus.id && haversineKm(world.buses.find((b) => b.id === a.busId)!.pos, bus.pos) <= RADIUS_KM,
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {alerts.map((a) => (
        <div key={a.id} className="card flex items-center gap-3 border-danger bg-red-50 p-4 text-danger" role="alert">
          <Siren size={24} className="shrink-0" />
          <p className="flex-1 font-medium">
            Emergencia de la unidad {a.busId.replace("-", " / ")} cerca de ti. Puedes recibir su pasaje en{" "}
            <Link href="/chofer/trasbordo" className="underline">Trasbordos</Link>.
          </p>
          <button className="rounded-lg p-2 hover:bg-red-100" onClick={() => dismissAlert(a.id)} aria-label="Cerrar alerta">
            <X size={20} />
          </button>
        </div>
      ))}

      {bus.status === "descanso" && (
        <div className="card flex flex-wrap items-center gap-3 bg-soft p-4">
          <PauseCircle size={24} className="text-brand" />
          <p className="flex-1 font-medium">Unidad en descanso. No aparece en el mapa de pasajeros.</p>
          <button className="btn btn-primary btn-lg" onClick={() => resumeService(bus.id)}>
            <Play size={20} />
            Reanudar servicio
          </button>
        </div>
      )}
      {bus.status === "emergencia" && (
        <div className="card border-danger bg-red-50 p-4 font-medium text-danger" role="alert">
          Emergencia activa. Gestiona el traslado de pasajeros en Trasbordos.
        </div>
      )}

      <section className="card p-6 text-center">
        <p className="text-sm text-muted">Pasajeros a bordo</p>
        <p className="my-2 text-7xl font-bold tabular-nums">
          {bus.occupancy}
          <span className="text-3xl font-semibold text-muted"> / {bus.max}</span>
        </p>
        <div className="mx-auto mb-3 h-3 max-w-sm overflow-hidden rounded-full bg-line">
          <div className={`h-full ${BAR[state]}`} style={{ width: `${(bus.occupancy / bus.max) * 100}%` }} />
        </div>
        <OccBadge occupancy={bus.occupancy} max={bus.max} />
      </section>

      {full && (
        <div className="card flex items-center gap-3 border-danger bg-red-50 p-4 font-semibold text-danger" role="alert">
          <Ban size={24} className="shrink-0" />
          Unidad llena. La admisión de nuevos pasajeros está bloqueada y el mapa muestra Lleno.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/chofer/validacion" className="btn btn-primary btn-lg">
          <ScanFace size={22} />
          Validar pasajeros ({pending})
        </Link>
        <button
          className="btn btn-outline btn-lg border-2 border-brand-dark"
          onClick={() => registerDisembark(bus.id)}
          disabled={bus.occupancy === 0}
        >
          <UserMinus size={22} />
          Bajó un pasajero
        </button>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold">Aforo máximo de la unidad</h2>
        <p className="mb-3 text-sm text-muted">Configurable entre 18 y 25 pasajeros.</p>
        <div className="flex items-center justify-center gap-6">
          <button
            className="btn btn-outline btn-lg w-16 border-2 border-brand-dark"
            aria-label="Reducir aforo"
            onClick={() => setMsg(setMax(bus.id, bus.max - 1))}
            disabled={bus.max <= 18}
          >
            <Minus size={24} />
          </button>
          <span className="w-16 text-center text-4xl font-bold tabular-nums">{bus.max}</span>
          <button
            className="btn btn-outline btn-lg w-16 border-2 border-brand-dark"
            aria-label="Aumentar aforo"
            onClick={() => setMsg(setMax(bus.id, bus.max + 1))}
            disabled={bus.max >= 25}
          >
            <Plus size={24} />
          </button>
        </div>
        {msg && <p className="mt-3 text-center text-sm text-danger">{msg}</p>}
      </section>
    </div>
  );
}
