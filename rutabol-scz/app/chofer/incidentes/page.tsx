"use client";

import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { act } from "@/lib/api";
import { useApp, type Incident } from "@/lib/store";

const TYPES: { id: Incident["type"]; label: string }[] = [
  { id: "accidente", label: "Accidente" },
  { id: "falla-mecanica", label: "Falla mecánica" },
  { id: "bloqueo", label: "Bloqueo de vía" },
  { id: "averia", label: "Avería" },
  { id: "otro", label: "Otro" },
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Reportar incidente</h1>
      <form onSubmit={send} className="card flex flex-col gap-4 p-4">
        <fieldset>
          <legend className="label">Tipo de incidente</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={type === t.id}
                onClick={() => setType(t.id)}
                className={`h-14 rounded-lg border text-sm font-semibold ${type === t.id ? "border-brand bg-soft text-brand-dark" : "border-line"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="desc" className="label">Descripción</label>
          <textarea id="desc" className="input h-24 py-2" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <p className="text-xs text-muted">
          Si es accidente o falla mecánica, la unidad pasa a emergencia y se avisa a las unidades cercanas. Después
          puedes solicitar el trasbordo en la sección Trasbordos.
        </p>
        <ErrorNote text={error} />
        {ok && (
          <p role="status" className="flex items-center gap-2 text-sm text-brand">
            <CheckCircle2 size={16} />
            Incidente reportado al Centro de Control.
          </p>
        )}
        <button className="btn btn-danger btn-lg" disabled={busy}>
          <TriangleAlert size={22} />
          {busy ? "Enviando..." : "Reportar incidente"}
        </button>
      </form>

      <section aria-labelledby="inc-h">
        <h2 id="inc-h" className="mb-2 font-semibold">Incidentes de mi unidad</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">No hay incidentes registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((i) => (
              <li key={i.id} className="card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{TYPES.find((t) => t.id === i.type)?.label}</span>
                  <span className="chip bg-soft text-brand-dark">{STATUS[i.status]} · gravedad {SEV[i.severity]}</span>
                </div>
                <p className="text-muted">{i.description}</p>
                <p className="text-xs text-muted">{new Date(i.at).toLocaleString("es-BO")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
