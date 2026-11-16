"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { useFetch } from "@/lib/api";
import type { Overview } from "@/components/control/types";
import {
  Chip, Empty, Page, QueryState, Section, StatCard, Status, Table, date, money, text,
} from "@/components/control/ui";

export default function ControlOverview() {
  const query = useFetch<Overview>("/control/overview", 5000);
  const data = query.data;
  const now = Date.now();

  const health = [...(data?.health ?? [])].sort((a, b) => {
    const rank = (check: Overview["health"][number]) =>
      check.ok ? 3 : check.severity === "critica" ? 0 : check.severity === "aviso" ? 1 : 2;
    return rank(a) - rank(b);
  });
  const failures = health.filter((check) => !check.ok && check.severity === "critica").length;
  const warnings = health.filter((check) => !check.ok && check.severity !== "critica").length;
  const correct = health.filter((check) => check.ok).length;

  return (
    <Page title="Resumen" subtitle="Estado del sistema y del servicio. Actualización automática cada 5 segundos.">
      <QueryState {...query} />
      {!query.loading && !query.error && !data && <Empty>No hay información del sistema.</Empty>}
      {data && (
        <>
          <Section title="Estado del sistema">
            <p role="status" className="mb-4 text-sm font-medium">
              {failures} fallas, {warnings} avisos, {correct} correctos
            </p>
            {!health.length ? <Empty>No hay comprobaciones disponibles.</Empty> : (
              <ul className="grid gap-3 md:grid-cols-2">
                {health.map((check) => {
                  const critical = !check.ok && check.severity === "critica";
                  const Icon = check.ok ? CheckCircle2 : critical ? OctagonAlert : AlertTriangle;
                  return (
                    <li key={check.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                      <Icon size={22} aria-hidden="true" className={`shrink-0 ${check.ok ? "text-brand" : critical ? "text-danger" : "text-warn"}`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{check.title}</h3>
                        <p className="mt-1 break-words text-sm text-muted">{check.detail}</p>
                        <div className="mt-2">
                          <Chip tone={check.ok ? "good" : critical ? "danger" : "warn"}>
                            {check.ok ? "Funciona" : critical ? "Falla" : "Atención"}
                          </Chip>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <section aria-label="Indicadores del servicio" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Buses activos" value={data.kpis.busesActivos} />
            <StatCard label="Buses en servicio" value={data.kpis.busesEnServicio} />
            <StatCard label="Buses sin señal" value={data.kpis.busesSinSenal} />
            <StatCard label="Viajes" value={data.kpis.viajes} />
            <StatCard label="Recaudación total" value={money(data.kpis.recaudacion)} />
            <StatCard label="Recaudación general" value={money(data.kpis.recaudacionPorCategoria.general)} />
            <StatCard label="Recaudación escolar" value={money(data.kpis.recaudacionPorCategoria.escolar)} />
            <StatCard label="Recaudación universitaria" value={money(data.kpis.recaudacionPorCategoria.universitario)} />
            <StatCard label="Ocupación promedio" value={`${data.kpis.ocupacionPromedioPct.toFixed(1)} %`} />
            <StatCard label="Incidentes abiertos" value={data.kpis.incidentesAbiertos} />
            <StatCard label="Reclamos abiertos" value={data.kpis.reclamosAbiertos} />
            <StatCard label="Acreditaciones pendientes" value={data.kpis.acreditacionesPendientes} />
            <StatCard label="Trasbordos" value={data.kpis.trasbordos} />
            <StatCard label="Recargas pendientes" value={data.kpis.recargasPendientes} />
          </section>

          <Section title="Servicio por línea">
            {!data.byLine.length ? <Empty>No hay líneas registradas.</Empty> : (
              <Table caption="Indicadores por línea" headers={["Línea", "Buses", "Viajes", "Recaudación", "Ocupación promedio"]}>
                {data.byLine.map((line) => (
                  <tr key={line.line}>
                    <td>{line.line}</td><td>{line.buses}</td><td>{line.viajes}</td>
                    <td className="whitespace-nowrap">{money(line.recaudacion)}</td>
                    <td>{line.ocupacionPromedioPct.toFixed(1)} %</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section title="Flota">
            {!data.buses.length ? <Empty>No hay buses registrados.</Empty> : (
              <Table caption="Estado de los buses" headers={["Línea", "Interno", "Placa", "Habilitación", "Estado", "Ocupación", "En servicio", "Señal", "Fuente", "Última actualización"]}>
                {data.buses.map((bus) => (
                  <tr key={bus.id}>
                    <td>{bus.line}</td><td>{bus.internal}</td><td className="whitespace-nowrap">{bus.plate}</td>
                    <td><Chip tone={bus.active ? "good" : "warn"}>{bus.active ? "Habilitado" : "Inactivo"}</Chip></td>
                    <td><Status value={bus.status} /></td>
                    <td className="whitespace-nowrap">{bus.occupancy} / {bus.max}</td>
                    <td>{bus.onDuty ? "Sí" : "No"}</td>
                    <td><Chip tone={bus.stale ? "danger" : "good"}>{bus.stale ? "Sin señal" : "Con señal"}</Chip></td>
                    <td>{text(bus.source)}</td>
                    <td className="whitespace-nowrap" title={date(bus.lastSeen)}>
                      Hace {Math.max(0, Math.floor((now - bus.lastSeen) / 1000))} s
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <Section title="Alertas activas">
              {!data.alerts.length ? <Empty>No hay alertas activas.</Empty> : (
                <ul className="space-y-3">
                  {[...data.alerts].sort((a, b) => b.at - a.at).map((alert) => (
                    <li key={alert.id} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={alert.kind === "aforo" ? "warn" : "danger"}>{text(alert.kind)}</Chip>
                        <span className="font-medium">Unidad {alert.busId}</span>
                      </div>
                      <p className="mt-2 break-words text-sm">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted">{date(alert.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Incidentes recientes">
              {!data.incidents.length ? <Empty>No hay incidentes registrados.</Empty> : (
                <ul className="space-y-3">
                  {[...data.incidents].sort((a, b) => b.at - a.at).slice(0, 8).map((incident) => (
                    <li key={incident.id} className="rounded-lg border border-line p-3">
                      <p className="font-medium">{text(incident.type)} · {incident.line} / {incident.internal}</p>
                      <p className="my-2 break-words text-sm">{incident.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Status value={incident.severity} /><Status value={incident.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted">{date(incident.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/control/incidentes" className="btn btn-outline mt-4">Gestionar incidentes</Link>
            </Section>
          </div>
        </>
      )}
    </Page>
  );
}
