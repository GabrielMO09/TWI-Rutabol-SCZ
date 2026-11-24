"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquareWarning, Plus, Send, X } from "lucide-react";
import { bs, dateTime } from "@/components/pasajero/format";
import { EmptyState, ErrorState, LineBadge, Notice, Sheet, Skeleton, StatusPill, type Tone } from "@/components/pasajero/ui";
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
const STATUS: Record<Claim["status"], { label: string; tone: Tone }> = {
  recibido: { label: "Recibido", tone: "neutral" },
  "en-revision": { label: "En revisión", tone: "warn" },
  resuelto: { label: "Resuelto", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
};

function toLocalInput(ms: number) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function Form() {
  const sp = useSearchParams();
  const { data: claims, error: loadError, loading, reload } = useFetch<Claim[]>("/claims/me", 8000);
  // Si llega desde el historial ("Reclamar este cobro") el formulario se abre ya prellenado.
  const [open, setOpen] = useState(!!sp.get("ticket"));
  const [line, setLine] = useState(sp.get("line") ?? "");
  const [internal, setInternal] = useState(sp.get("internal") ?? "");
  const [when, setWhen] = useState(toLocalInput(Number(sp.get("at")) || Date.now()));
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_000_000) {
      e.target.value = "";
      return setError("La evidencia no puede superar 1 MB.");
    }
    setError(null);
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
      setOpen(false);
      setDescription("");
      setEvidence("");
      void reload();
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Reclamos por cobro indebido</h1>
        <button type="button" className="psj-btn psj-btn-primary" onClick={() => { setOk(false); setOpen(true); }}>
          <Plus size={18} aria-hidden="true" />
          Nuevo reclamo
        </button>
      </div>

      {ok && <Notice>Reclamo registrado. Te avisaremos cuando cambie su estado.</Notice>}

      <section aria-labelledby="mis" className="flex flex-col gap-2">
        <h2 id="mis" className="sr-only">Mis reclamos</h2>
        {loading && !claims ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : loadError && !claims ? (
          <ErrorState message={loadError} onRetry={() => void reload()} />
        ) : !claims || claims.length === 0 ? (
          <div className="psj-card">
            <EmptyState icon={MessageSquareWarning} title="Aún no presentaste reclamos">
              Si te cobraron de más, reclámalo desde aquí o desde tu historial de viajes.
            </EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {claims.map((c) => (
              <li key={c.id} className="psj-card flex flex-col gap-2 p-4 text-sm">
                <div className="flex items-center gap-3">
                  <LineBadge line={c.line} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Línea {c.line} · Interno {c.internal}</p>
                    <p className="text-xs text-(--psj-muted-strong)">Viaje del {dateTime(c.tripAt)}</p>
                  </div>
                  <StatusPill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusPill>
                </div>
                <p className="text-(--psj-muted-strong)">{c.description}</p>
                {c.response && <p className="rounded-lg bg-(--psj-green-soft) p-2">Respuesta: {c.response}</p>}
                {!!c.refund && <p className="font-medium text-(--psj-green)">Reembolso acreditado: {bs(c.refund)}</p>}
                {c.history?.length > 0 && (
                  <details className="text-xs text-(--psj-muted-strong)">
                    <summary className="min-h-8 cursor-pointer font-medium">Historial ({c.history.length})</summary>
                    <ol className="mt-1 flex flex-col gap-1 border-l-2 border-(--psj-line) pl-3">
                      {c.history.map((h, i) => (
                        <li key={i}>
                          {dateTime(h.at)} · {h.status}{h.note ? ` · ${h.note}` : ""}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo reclamo">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold">Viaje</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="l" className="psj-label">Línea</label>
                <input id="l" className="psj-input" value={line} onChange={(e) => setLine(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="i" className="psj-label">Interno</label>
                <input id="i" className="psj-input" value={internal} onChange={(e) => setInternal(e.target.value)} required />
              </div>
            </div>
            <div>
              <label htmlFor="w" className="psj-label">Fecha y hora del viaje</label>
              <input id="w" type="datetime-local" className="psj-input" value={when} onChange={(e) => setWhen(e.target.value)} required />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Qué pasó</legend>
            <label htmlFor="d" className="psj-label">Descripción</label>
            <textarea id="d" className="psj-input psj-textarea" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Evidencia (opcional)</legend>
            <label htmlFor="e" className="psj-label">Imagen de hasta 1 MB</label>
            <input id="e" type="file" accept="image/*" onChange={onFile} className="text-sm" />
            {evidence && (
              <div className="relative mt-2 inline-block">
                {/* Vista previa local de la imagen elegida (data URL). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={evidence} alt="Vista previa de la evidencia" className="h-28 rounded-lg border border-(--psj-line) object-cover" />
                <button type="button" aria-label="Quitar evidencia" onClick={() => setEvidence("")} className="psj-icon-btn absolute -right-3 -top-3 h-8 w-8 bg-(--psj-surface)">
                  <X size={14} />
                </button>
              </div>
            )}
          </fieldset>
          {error && <ErrorState message={error} />}
          <button className="psj-btn psj-btn-primary" disabled={busy}>
            <Send size={16} aria-hidden="true" />
            {busy ? "Enviando..." : "Enviar reclamo"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

export default function Reclamos() {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
      <Form />
    </Suspense>
  );
}
