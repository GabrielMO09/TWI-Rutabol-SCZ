"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/pasajero/ui";
import { act } from "@/lib/api";

export const date = (value?: number) =>
  value === undefined ? "Sin fecha" : new Date(value).toLocaleString("es-BO");

export const money = (value: number) =>
  `Bs ${value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const labels: Record<string, string> = {
  activo: "Activo",
  activa: "Activa",
  suspendido: "Suspendido",
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  observada: "Observada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  recibido: "Recibido",
  "en-revision": "En revisión",
  resuelto: "Resuelto",
  rechazado: "Rechazado",
  reportado: "Reportado",
  "en-atencion": "En atención",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  escolar: "Escolar",
  universitario: "Universitario",
  general: "General",
  chofer: "Conductor",
  pasajero: "Pasajero",
  control: "Centro de Control",
  descanso: "Descanso",
  emergencia: "Emergencia",
  accidente: "Accidente",
  "falla-mecanica": "Falla mecánica",
  bloqueo: "Bloqueo",
  averia: "Avería",
  otro: "Otro",
  simulado: "Simulado",
  gps: "GPS",
  pagado: "Pagado",
  abordado: "Abordado",
  "pase-temporal": "Pase temporal",
  aforo: "Aforo",
  incidente: "Incidente",
};

export const text = (value: string) => labels[value] ?? value;

export function Chip({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "good" | "warn" | "danger" | "neutral";
}) {
  const colors = {
    good: "psj-pill-success",
    warn: "psj-pill-warn",
    danger: "psj-pill-danger",
    neutral: "psj-pill-neutral",
  };
  return <span className={`psj-pill ${colors[tone]}`}>{children}</span>;
}

export function Status({ value }: { value: string }) {
  const tone = ["activo", "activa", "aprobada", "resuelto", "baja"].includes(value)
    ? "good"
    : ["suspendido", "rechazada", "rechazado", "emergencia", "alta", "vencida"].includes(value)
      ? "danger"
      : "warn";
  return <Chip tone={tone}>{text(value)}</Chip>;
}

export function Page({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <p className="mb-1 text-sm font-medium text-(--psj-green)">Centro de Control</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-(--psj-muted-strong)">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="psj-card min-w-0 p-4">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Table({ headers, children, caption }: {
  headers: string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--psj-line) bg-(--psj-surface)" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-(--psj-bg) text-(--psj-muted-strong)">
          <tr>{headers.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-(--psj-line) [&_td]:px-3 [&_td]:py-3 [&_td]:align-top">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children = "No hay registros para mostrar." }: { children?: ReactNode }) {
  return <p role="status" className="rounded-lg bg-(--psj-bg) p-4 text-center text-sm text-(--psj-muted-strong)">{children}</p>;
}

export function QueryState({ loading, error, reload }: {
  loading: boolean;
  error: string | null;
  reload: () => unknown;
}) {
  return (
    <div className="flex flex-col gap-2 print:hidden">
      {loading && <p role="status" className="text-sm text-(--psj-muted-strong)">Cargando datos…</p>}
      {error && <ErrorState message={error} />}
      {error && <p className="text-sm text-(--psj-muted-strong)">Los datos visibles pueden estar desactualizados.</p>}
      <div>
        <button type="button" className="psj-btn psj-btn-outline" disabled={loading} onClick={() => void reload()}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </div>
    </div>
  );
}

export function Notice({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div aria-live="polite" className="space-y-2">
      {error && <ErrorState message={error} />}
      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-(--psj-green-soft) p-3 text-sm text-(--psj-green-dark)">
          <CheckCircle2 size={18} aria-hidden="true" />{success}
        </p>
      )}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="psj-card p-4">
      <p className="text-sm text-(--psj-muted-strong)">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function useCommand() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(path: string, method: string, body: unknown, message: string) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const failure = await act(path, method, body);
      if (failure) {
        setError(failure);
        return false;
      }
      setSuccess(message);
      return true;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return { busy, error, success, setError, setSuccess, run };
}
