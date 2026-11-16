"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { act, useFetch } from "@/lib/api";

interface Claim {
  id: string;
  line: string;
  internal: string;
  tripAt: number;
  description: string;
  status: "recibido" | "en-revision" | "resuelto" | "rechazado";
  response?: string;
  refund?: number;
  at: number;
  history: { at: number; status: string; by: string; note?: string }[];
}
const STATUS = { recibido: "Recibido", "en-revision": "En revisión", resuelto: "Resuelto", rechazado: "Rechazado" } as const;

function toLocalInput(ms: number) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function Form() {
  const sp = useSearchParams();
  const { data: claims, reload } = useFetch<Claim[]>("/claims/me", 8000);
  const [line, setLine] = useState(sp.get("line") ?? "");
  const [internal, setInternal] = useState(sp.get("internal") ?? "");
  const [when, setWhen] = useState(toLocalInput(Number(sp.get("at")) || Date.now()));
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_000_000) return setError("La evidencia no puede superar 1 MB.");
    const r = new FileReader();
    r.onload = () => setEvidence(String(r.result));
    r.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) return setError("Describe el problema con al menos 10 caracteres.");
    setBusy(true);
    const err = await act("/claims", "POST", {
      line,
      internal,
      tripAt: new Date(when).getTime(),
      description,
      evidence: evidence || undefined,
      ticketId: sp.get("ticket") || undefined,
    });
    setBusy(false);
    setError(err);
    if (!err) {
      setOk(true);
      setDescription("");
      setEvidence("");
      void reload();
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Reclamos por cobro indebido</h1>
      <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="l" className="label">Línea</label>
            <input id="l" className="input" value={line} onChange={(e) => setLine(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="i" className="label">Interno</label>
            <input id="i" className="input" value={internal} onChange={(e) => setInternal(e.target.value)} required />
          </div>
        </div>
        <div>
          <label htmlFor="w" className="label">Fecha y hora del viaje</label>
          <input id="w" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="d" className="label">Descripción</label>
          <textarea id="d" className="input h-28 py-2" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="e" className="label">Evidencia (imagen, opcional)</label>
          <input id="e" type="file" accept="image/*" onChange={onFile} className="text-sm" />
        </div>
        <ErrorNote text={error} />
        {ok && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2 text-sm text-brand-dark">
            <CheckCircle2 size={16} />
            Reclamo registrado. Te avisaremos cuando cambie su estado.
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          <Send size={16} />
          {busy ? "Enviando..." : "Enviar reclamo"}
        </button>
      </form>

      <section aria-labelledby="mis">
        <h2 id="mis" className="mb-2 font-semibold">Mis reclamos</h2>
        {!claims || claims.length === 0 ? (
          <p className="text-sm text-muted">Aún no presentaste reclamos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claims.map((c) => (
              <li key={c.id} className="card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Línea {c.line} / Interno {c.internal}</span>
                  <span className="chip bg-soft text-brand-dark">{STATUS[c.status]}</span>
                </div>
                <p className="mt-1 text-muted">{c.description}</p>
                {c.response && <p className="mt-2 rounded-lg bg-soft p-2">Respuesta: {c.response}</p>}
                {!!c.refund && <p className="mt-1 font-medium text-brand">Reembolso acreditado: Bs {c.refund.toFixed(2)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Reclamos() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando...</p>}>
      <Form />
    </Suspense>
  );
}
