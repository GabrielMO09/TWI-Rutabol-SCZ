"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileDown, Printer } from "lucide-react";
import { api, download, useFetch } from "@/lib/api";
import type { Line, Report } from "@/components/control/types";
import { Empty, Notice, Page, QueryState, Section, StatCard, Table, date, money, text } from "@/components/control/ui";

interface Filters {
  from: string;
  to: string;
  line: string;
}

interface Preview {
  report: Report;
  params: string;
  filters: Filters;
  generatedAt: number;
}

function startOfLocalDay(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfLocalDay(value: string) {
  const day = new Date(`${value}T00:00:00`);
  day.setDate(day.getDate() + 1);
  return day.getTime() - 1;
}

function totalLabel(key: string) {
  const labels: Record<string, string> = {
    viajes: "Viajes",
    tickets: "Pasajes",
    count: "Cantidad",
    total: "Total",
    amount: "Importe",
    revenue: "Recaudación",
    recaudacion: "Recaudación",
    totalFare: "Total de tarifas",
    totalAmount: "Importe total",
    totalTickets: "Total de pasajes",
    byCategory: "Por categoría",
    porCategoria: "Por categoría",
    recaudacionPorCategoria: "Recaudación por categoría",
    byMethod: "Por método",
    porMetodo: "Por método",
    general: "General",
    escolar: "Escolar",
    universitario: "Universitario",
  };
  return labels[key] ?? text(key);
}

function TotalValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Sin datos</span>;
  if (typeof value === "number") return <span>{value.toLocaleString("es-BO", { maximumFractionDigits: 2 })}</span>;
  if (typeof value === "string") return <span>{value}</span>;
  if (typeof value === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  if (Array.isArray(value)) {
    return <ul className="space-y-1">{value.map((item: unknown, index) => <li key={index}><TotalValue value={item} /></li>)}</ul>;
  }
  if (typeof value === "object") {
    return (
      <dl className="space-y-1">
        {Object.entries(value).map(([key, nested]) => (
          <div key={key} className="flex flex-wrap justify-between gap-2">
            <dt>{totalLabel(key)}</dt><dd><TotalValue value={nested} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>Sin datos</span>;
}

export default function ReportsPage() {
  const lines = useFetch<Line[]>("/control/lines");
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", line: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const lock = useRef(false);
  const downloadLock = useRef(false);

  const changed = preview !== null && (
    preview.filters.from !== filters.from || preview.filters.to !== filters.to || preview.filters.line !== filters.line
  );

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError(null);
    setSuccess(null);
    const from = filters.from ? startOfLocalDay(filters.from) : undefined;
    const to = filters.to ? endOfLocalDay(filters.to) : undefined;
    if ((from !== undefined && !Number.isFinite(from)) || (to !== undefined && !Number.isFinite(to))) {
      setError("Revisa las fechas del reporte.");
      return;
    }
    if (from !== undefined && to !== undefined && from > to) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    const params = new URLSearchParams();
    if (from !== undefined) params.set("from", String(from));
    if (to !== undefined) params.set("to", String(to));
    if (filters.line) params.set("line", filters.line);
    lock.current = true;
    setLoading(true);
    setPreview(null);
    try {
      const report = await api<Report>(`/control/reports?${params.toString()}${params.size ? "&" : ""}format=json`);
      setPreview({ report, params: params.toString(), filters: { ...filters }, generatedAt: Date.now() });
      setSuccess(report.rows.length ? "Vista previa generada." : "Consulta completada. No hay viajes para estos filtros.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo generar el reporte.");
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  async function exportCsv() {
    if (!preview || changed || downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const failure = await download(
        `/control/reports?${preview.params}${preview.params ? "&" : ""}format=csv`,
        "reporte-rutabol.csv",
      );
      if (failure) setError(failure);
      else setSuccess("Archivo CSV generado. La descarga fue solicitada.");
    } finally {
      downloadLock.current = false;
      setDownloading(false);
    }
  }

  function printReport() {
    if (!preview || changed) return;
    setError(null);
    setSuccess("Se solicitó la impresión. Puedes guardar como PDF desde el diálogo del navegador.");
    window.print();
  }

  const revenue = preview?.report.rows.reduce((sum, row) => sum + row.fare, 0) ?? 0;

  return (
    <Page title="Reportes" subtitle="Genera una vista previa y exporta la información del servicio.">
      <style>{`
        @media print {
          body { background: white !important; }
          header, nav { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .control-report-table { overflow: visible !important; }
          table { font-size: 9pt !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          .card { box-shadow: none !important; }
        }
      `}</style>
      <div className="print:hidden">
        <Section title="Filtros">
          <QueryState {...lines} />
          <form onSubmit={generate} className="mt-4 space-y-4">
            <fieldset disabled={loading || downloading} className="grid gap-3 sm:grid-cols-3">
              <legend className="sr-only">Filtros del reporte</legend>
              <div>
                <label htmlFor="report-from" className="label">Desde (opcional)</label>
                <input id="report-from" type="date" className="input" value={filters.from}
                  onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
              </div>
              <div>
                <label htmlFor="report-to" className="label">Hasta (opcional)</label>
                <input id="report-to" type="date" className="input" value={filters.to}
                  onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
              </div>
              <div>
                <label htmlFor="report-line" className="label">Línea</label>
                <select id="report-line" className="input" value={filters.line} onChange={(event) => setFilters({ ...filters, line: event.target.value })}>
                  <option value="">Todas las líneas</option>
                  {lines.data?.map((line) => <option key={line.id} value={line.id}>{line.id} · {line.name}</option>)}
                </select>
              </div>
            </fieldset>
            <p className="text-xs text-muted">Las fechas incluyen el día completo según la hora local. Deja ambas vacías para consultar todo el período disponible.</p>
            <button className="btn btn-primary" disabled={loading || downloading}>{loading ? "Generando…" : "Generar vista previa"}</button>
          </form>
        </Section>
      </div>
      <div className="print:hidden"><Notice error={error} success={success} /></div>
      {loading && <p role="status">Cargando el reporte…</p>}
      {!preview && !loading && !error && <Empty>Selecciona los filtros y genera una vista previa.</Empty>}
      {preview && (
        <>
          {changed && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-warn print:hidden">Los filtros cambiaron. Genera una nueva vista previa para descargar o imprimir.</p>}
          <Section title="Vista previa">
            <p className="mb-2 text-sm">Período: {preview.filters.from || "Inicio disponible"} a {preview.filters.to || "Último registro"} · Línea: {preview.filters.line || "Todas"}</p>
            <p className="mb-4 text-xs text-muted">Generado: {date(preview.generatedAt)}</p>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <StatCard label="Pasajes en la vista previa" value={preview.report.rows.length} />
              <StatCard label="Suma de tarifas de las filas" value={money(revenue)} />
            </div>
            <div className="mb-4 flex flex-wrap gap-2 print:hidden">
              <button type="button" className="btn btn-primary" disabled={downloading || loading || changed} onClick={() => void exportCsv()}>
                <FileDown size={18} aria-hidden="true" />{downloading ? "Descargando…" : "Descargar CSV"}
              </button>
              <button type="button" className="btn btn-outline" disabled={downloading || loading || changed} onClick={printReport}>
                <Printer size={18} aria-hidden="true" />Imprimir / PDF
              </button>
            </div>
            <p className="mb-4 text-xs text-muted print:hidden">El CSV consulta nuevamente el servidor con estos filtros; puede incluir movimientos posteriores a la vista previa.</p>
            {!preview.report.rows.length ? <Empty>No hay viajes en el período seleccionado.</Empty> : (
              <div className="control-report-table overflow-x-auto">
                <Table caption="Detalle del reporte de pasajes" headers={["Pasaje", "Fecha", "Línea", "Interno", "Categoría", "Tarifa", "Método", "Estado"]}>
                  {preview.report.rows.map((row) => (
                    <tr key={row.ticketId}>
                      <td>{row.ticketId}</td><td className="whitespace-nowrap">{date(row.at)}</td>
                      <td>{row.line}</td><td>{row.internal}</td><td>{text(row.category)}</td>
                      <td className="whitespace-nowrap">{money(row.fare)}</td><td>{row.method}</td><td>{text(row.status)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </Section>
          <Section title="Totales del servidor">
            {!Object.keys(preview.report.totals).length ? <Empty>No hay totales adicionales.</Empty> : (
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(preview.report.totals).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-soft p-3">
                    <dt className="mb-2 text-sm font-semibold">{totalLabel(key)}</dt>
                    <dd className="break-words text-sm"><TotalValue value={value} /></dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
