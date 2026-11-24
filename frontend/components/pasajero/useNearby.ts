"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { PLAZA, RADIUS_KM, TICK_MS, haversineKm, type LatLng } from "@/lib/data";
import type { Stop } from "@/lib/routes";
import { useApp, type Bus } from "@/lib/store";

export interface NearbyItem {
  bus: Bus;
  distanceKm: number;
  etaMin: number | null;
  etaReliable: boolean;
}
interface Nearby {
  radiusKm: number;
  items: NearbyItem[];
}

/** Datos del mapa del pasajero: mismas consultas y reglas que MapExplorer (/public/nearby cada 4 s, paradas cada 15 s). */
export function useNearby() {
  const { world, lines, linesError, paths, selectedBusId, selectBus } = useApp();
  const [gps, setGps] = useState<LatLng>(PLAZA);
  const [ref, setRef] = useState("plaza");
  const [line, setLine] = useState("");
  const [direction, setDirection] = useState("");
  const [text, setText] = useState("");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const references = useMemo(() => [
    { id: "plaza", label: "Plaza 24 de Septiembre", pos: PLAZA },
    ...lines.flatMap((entry) => {
      const pos = entry.waypoints.at(-1);
      return pos ? [{ id: `line:${entry.id}`, label: `Final de ${entry.name}`, pos }] : [];
    }),
  ], [lines]);
  const reference = references.find((entry) => entry.id === ref) ?? references[0];
  const user = ref === "" ? gps : reference.pos;
  const chosenLine = lines.find((entry) => entry.id === line);
  const lineId = chosenLine?.id ?? "";
  const lineIds = useMemo(() => new Set(lines.map((entry) => entry.id)), [lines]);

  const q = new URLSearchParams({ lat: String(user[0]), lng: String(user[1]), radiusKm: String(RADIUS_KM) });
  if (lineId) q.set("line", lineId);
  if (direction) q.set("direction", direction);
  const { data, error, loading, reload } = useFetch<Nearby>(`/public/nearby?${q}`, TICK_MS);
  const { data: stops, error: stopsError } = useFetch<Stop[]>("/public/stops", 15000);

  const items = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (data?.items ?? [])
      .filter(({ bus }) => (!lineId || bus.line === lineId) && (!direction || bus.direction === direction))
      .map((it) => ({ ...it, bus: world.buses.find((b) => b.id === it.bus.id) ?? it.bus }))
      .filter((it) => !t || `${it.bus.line} ${it.bus.internal} ${it.bus.plate ?? ""}`.toLowerCase().includes(t));
  }, [data, world.buses, text, lineId, direction]);

  const buses = useMemo(() => items.map((i) => i.bus), [items]);
  const selected = buses.find((b) => b.id === selectedBusId) ?? null;
  const routeLine = lineId || selected?.line;
  const routePath = routeLine ? paths[routeLine] : undefined;
  const visibleStops = useMemo(() => (stops ?? []).filter(
    (stop) => lineIds.has(stop.line) && (!routeLine || stop.line === routeLine),
  ), [stops, lineIds, routeLine]);

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Tu navegador no permite geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here: LatLng = [p.coords.latitude, p.coords.longitude];
        if (haversineKm(here, PLAZA) > 30) {
          setGeoMsg("Estás fuera de Santa Cruz; se usa la Plaza 24 de Septiembre como referencia.");
          return;
        }
        setGps(here);
        setRef("");
        setGeoMsg(null);
      },
      () => setGeoMsg("No se pudo obtener tu ubicación. Elige un punto de referencia."),
      { timeout: 8000 },
    );
  }

  return {
    lines, linesError, stopsError, error, loading, reload, geoMsg, locate,
    references, reference, ref, setRef, user,
    line, lineId, setLine, chosenLine, direction, setDirection, text, setText,
    items, buses, selected, selectedBusId, selectBus,
    routePath: routePath && routePath.length > 1 ? routePath : undefined, visibleStops,
    noSignal: world.buses.filter((b) => b.stale && (!lineId || b.line === lineId)),
    incidents: world.incidents.filter((i) => i.status !== "resuelto"),
    temp: world.tickets.find((t) => t.status === "pase-temporal"),
  };
}
