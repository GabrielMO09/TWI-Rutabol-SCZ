"use client";

import { useState } from "react";
import { CarFront, CheckCircle2, CircleHelp, ClipboardList, Construction, TriangleAlert, Wrench, Zap, type LucideIcon } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/pasajero/ui";
import { act } from "@/lib/api";
import { useApp, type Incident } from "@/lib/store";

const TYPES: { id: Incident["type"]; label: string; icon: LucideIcon }[] = [
  { id: "accidente", label: "Accidente", icon: CarFront },
  { id: "falla-mecanica", label: "Falla mecánica", icon: Wrench },
  { id: "bloqueo", label: "Bloqueo de vía", icon: Construction },
  { id: "averia", label: "Avería", icon: Zap },
  { id: "otro", label: "Otro", icon: CircleHelp },
];
const STATUS = { reportado: "Reportado", "en-atencion": "En atención", resuelto: "Resuelto" } as const;
const SEV = { alta: "Alta", media: "Media", baja: "Baja" } as const;

export default function Incidentes() {
  const { profile, world, refresh } = useApp();
  const bus = world.buses.find((b) => b.id === profile?.busId);
  const [type, setType] = useState<Incident["type"]>("falla-mecanica");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!bus) return null;

  const mine = world.incidents.filter((i) => i.busId === bus.id);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) return setError("Describe lo ocurrido (mínimo 5 caracteres).");
    setBusy(true);
    // La ubicación es opcional: si el chofer la niega, el incidente se reporta igual con la última posición conocida.
    const pos = await new Promise<[number, number] | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve([p.coords.latitude, p.coords.longitude]),
        () => resolve(null),
        { timeout: 4000 },
      );
    });
    const err = await act("/incidents", "POST", { type, description, lat: pos?.[0], lng: pos?.[1] });
    setBusy(false);
    setError(err);
    setOk(!err);
    if (!err) {
      setDescription("");
      await refresh();
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 lg:grid lg:max-w-[1280px] lg:grid-cols-2 lg:items-start lg:gap-6">
      <h1 className="sr-only">Reportar incidente</h1>
      <form onSubmit={send} className="psj-card flex flex-col gap-4 p-4 lg:p-6">
        <fieldset>
          <legend className="psj-label">Tipo de incidente</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={type === t.id}
                onClick={() => setType(t.id)}
                className="psj-choice lg:flex lg:min-h-24! lg:flex-col lg:items-center lg:justify-center lg:gap-2"
              >
                <t.icon size={24} aria-hidden="true" className="hidden lg:block" />
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="desc" className="psj-label">Descripción</label>
          <textarea id="desc" className="psj-psj-input psj-textarea" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <p className="text-xs text-(--psj-muted-strong)">
          Si es accidente o falla mecánica, la unidad pasa a emergencia y se avisa a las unidades cercanas. Después
          puedes solicitar el trasbordo en la sección Trasbordos.
        </p>
        {error && <ErrorState message={error} />}
        {ok && (
          <p role="status" className="flex items-center gap-2 text-sm text-(--psj-green)">
            <CheckCircle2 size={16} />
            Incidente reportado al Centro de Control.
          </p>
        )}
        <button className="psj-btn psj-btn-danger psj-btn-lg" disabled={busy}>
          <TriangleAlert size={22} />
          {busy ? "Enviando..." : "Reportar incidente"}
        </button>
      </form>

      <section aria-labelledby="inc-h">
        <h2 id="inc-h" className="mb-2 font-semibold">Incidentes de mi unidad</h2>
        {mine.length === 0 ? (
          <>
            <p className="text-sm text-(--psj-muted-strong) lg:hidden">No hay incidentes registrados.</p>
            <div className="psj-card hidden lg:block">
              <EmptyState icon={ClipboardList} title="No hay incidentes registrados">
                Los reportes de tu unidad aparecerán aquí con su estado y gravedad.
              </EmptyState>
            </div>
          </>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((i) => (
              <li key={i.id} className="psj-card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{TYPES.find((t) => t.id === i.type)?.label}</span>
                  <span className="psj-pill psj-pill-neutral">{STATUS[i.status]} · gravedad {SEV[i.severity]}</span>
                </div>
                <p className="text-(--psj-muted-strong)">{i.description}</p>
                <p className="text-xs text-(--psj-muted-strong)">{new Date(i.at).toLocaleString("es-BO")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
