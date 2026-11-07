"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, Locate, Navigation, Radio, Ticket } from "lucide-react";
import MapView from "@/components/MapView";
import OccBadge from "@/components/OccBadge";
import { PLAZA, RADIUS_KM, TICK_MS, haversineKm, type LatLng } from "@/lib/data";
import { nearbyBuses, useApp } from "@/lib/store";

export default function MapaPasajero() {
  const { world, paths, selectedBusId, selectBus } = useApp();
  const [user, setUser] = useState<LatLng>(PLAZA);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const nearby = useMemo(() => nearbyBuses(world.buses, user, RADIUS_KM), [world.buses, user]);
  const buses = useMemo(() => nearby.map((n) => n.bus), [nearby]);
  const selected = buses.find((b) => b.id === selectedBusId) ?? null;
  const temp = world.tickets.find((t) => t.status === "pase-temporal");

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Tu navegador no permite geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here: LatLng = [p.coords.latitude, p.coords.longitude];
        if (haversineKm(here, PLAZA) > 30) {
          setGeoMsg("Estás fuera de Santa Cruz; se mantiene la Plaza 24 de Septiembre como referencia.");
          return;
        }
        setUser(here);
        setGeoMsg(null);
      },
      () => setGeoMsg("No se pudo obtener tu ubicación."),
      { timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {temp && (
        <div className="card flex items-start gap-3 border-brand bg-soft p-3 text-sm">
          <Ticket size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>
            Tienes un pase temporal hacia la unidad <strong>{temp.transferredTo}</strong>. Abórdala sin pagar de nuevo.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="order-2 flex flex-col gap-3 lg:order-1">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Micros a {RADIUS_KM} km</h1>
            <span className="chip bg-soft text-brand-dark">
              <Radio size={12} />
              Cada {TICK_MS / 1000} s
            </span>
          </div>

          <button className="btn btn-outline" onClick={locate}>
            <Locate size={16} />
            Usar mi ubicación
          </button>
          {geoMsg && <p className="text-xs text-muted">{geoMsg}</p>}

          <ul className="flex max-h-[46dvh] flex-col gap-2 overflow-y-auto pr-1">
            {nearby.length === 0 && <li className="text-sm text-muted">No hay micros activos en tu radio.</li>}
            {nearby.map(({ bus, km }) => {
              const active = bus.id === selectedBusId;
              const full = bus.occupancy >= bus.max;
              return (
                <li key={bus.id} className={`card p-3 ${active ? "border-brand bg-soft" : ""}`}>
                  <button onClick={() => selectBus(active ? null : bus.id)} className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Línea {bus.line} · Interno {bus.internal}
                      </span>
                      <OccBadge occupancy={bus.occupancy} max={bus.max} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-muted">
                      <span>
                        {bus.occupancy}/{bus.max} pasajeros
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation size={12} />
                        {km.toFixed(1)} km
                      </span>
                    </div>
                  </button>
                  {active && (
                    <div className="mt-3">
                      {full ? (
                        <p className="flex items-center gap-2 text-sm font-medium text-danger">
                          <Ban size={16} />
                          Unidad llena: no admite más pasajeros.
                        </p>
                      ) : (
                        <Link href="/pasajero/pago" className="btn btn-primary w-full">
                          Pagar pasaje en esta unidad
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">
            Mapa de OpenStreetMap y rutas calculadas con OSRM (servicios gratuitos). Las posiciones son simuladas.
          </p>
        </section>

        <div className="order-1 h-[52dvh] overflow-hidden rounded-xl border border-line lg:order-2 lg:h-[calc(100dvh-210px)]">
          <MapView
            buses={buses}
            user={user}
            radiusKm={RADIUS_KM}
            selectedId={selected?.id ?? null}
            onSelect={(id) => selectBus(id)}
            routePath={selected ? paths[selected.line] : undefined}
          />
        </div>
      </div>
    </div>
  );
}
