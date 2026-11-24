"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Minus, PauseCircle, Play, Plus, ScanFace, Siren, UserMinus, X } from "lucide-react";
import { JornadaCard, OccupancyCorrection } from "@/components/DriverTools";
import { StatusPill } from "@/components/pasajero/ui";
import { OCC_LABEL, RADIUS_KM, haversineKm, occState } from "@/lib/data";
import { useApp } from "@/lib/store";

const BAR: Record<string, string> = {
  disponible: "bg-(--psj-green)",
  moderado: "bg-lime-600",
  "casi-lleno": "bg-(--psj-warn)",
  lleno: "bg-(--psj-danger)",
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
    (a) => (a.kind ?? "emergencia") !== "aforo" && a.busId !== bus.id && haversineKm(world.buses.find((b) => b.id === a.busId)!.pos, bus.pos) <= RADIUS_KM,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="sr-only">Panel del chofer</h1>
      <JornadaCard bus={bus} />
      {alerts.map((a) => (
        <div key={a.id} className="psj-card flex items-center gap-3 border-(--psj-danger) bg-(--psj-danger-soft) p-4 text-(--psj-danger)" role="alert">
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
        <div className="psj-card flex flex-wrap items-center gap-3 bg-(--psj-green-soft) p-4">
          <PauseCircle size={24} className="text-(--psj-green)" />
          <p className="flex-1 font-medium">Unidad en descanso. No aparece en el mapa de pasajeros.</p>
          <button className="psj-btn psj-btn-primary psj-btn-lg" onClick={() => resumeService(bus.id)}>
            <Play size={20} />
            Reanudar servicio
          </button>
        </div>
      )}
      {bus.status === "emergencia" && (
        <div className="psj-card border-(--psj-danger) bg-(--psj-danger-soft) p-4 font-medium text-(--psj-danger)" role="alert">
          Emergencia activa. Gestiona el traslado de pasajeros en Trasbordos.
        </div>
      )}

      <section className="psj-card p-6 text-center">
        <p className="text-sm text-(--psj-muted-strong)">Pasajeros a bordo</p>
        <p className="my-2 text-7xl font-bold tabular-nums">
          {bus.occupancy}
          <span className="text-3xl font-semibold text-(--psj-muted-strong)"> / {bus.max}</span>
        </p>
        <div className="mx-auto mb-3 h-3 max-w-sm overflow-hidden rounded-full bg-(--psj-line)">
          <div className={`h-full ${BAR[state]}`} style={{ width: `${(bus.occupancy / bus.max) * 100}%` }} />
        </div>
        <StatusPill tone={full ? "danger" : state === "casi-lleno" ? "warn" : "success"}>{OCC_LABEL[state]}</StatusPill>
      </section>

      {full && (
        <div className="psj-card flex items-center gap-3 border-(--psj-danger) bg-(--psj-danger-soft) p-4 font-semibold text-(--psj-danger)" role="alert">
          <Ban size={24} className="shrink-0" />
          Unidad llena. La admisión de nuevos pasajeros está bloqueada y el mapa muestra Lleno.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/chofer/validacion" className="psj-btn psj-btn-primary psj-btn-lg">
          <ScanFace size={22} />
          Validar pasajeros ({pending})
        </Link>
        <button
          className="psj-btn psj-btn-outline psj-btn-lg"
          onClick={() => registerDisembark(bus.id)}
          disabled={bus.occupancy === 0}
        >
          <UserMinus size={22} />
          Bajó un pasajero
        </button>
      </div>

      <section className="psj-card p-4">
        <h2 className="font-semibold">Aforo máximo de la unidad</h2>
        <p className="mb-3 text-sm text-(--psj-muted-strong)">Configurable entre 18 y 25 pasajeros.</p>
        <div className="flex items-center justify-center gap-6">
          <button
            className="psj-btn psj-btn-outline psj-btn-lg w-16"
            aria-label="Reducir aforo"
            onClick={() => setMax(bus.id, bus.max - 1).then(setMsg)}
            disabled={bus.max <= 18}
          >
            <Minus size={24} />
          </button>
          <span className="w-16 text-center text-4xl font-bold tabular-nums">{bus.max}</span>
          <button
            className="psj-btn psj-btn-outline psj-btn-lg w-16"
            aria-label="Aumentar aforo"
            onClick={() => setMax(bus.id, bus.max + 1).then(setMsg)}
            disabled={bus.max >= 25}
          >
            <Plus size={24} />
          </button>
        </div>
        {msg && <p className="mt-3 text-center text-sm text-(--psj-danger)">{msg}</p>}
      </section>
      <OccupancyCorrection bus={bus} />
    </div>
  );
}
