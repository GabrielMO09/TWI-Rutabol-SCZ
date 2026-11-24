"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OCC_LABEL, occState, type LatLng } from "@/lib/data";
import type { Stop } from "@/lib/routes";
import type { Bus } from "@/lib/store";

interface Props {
  buses: Bus[];
  user: LatLng;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  routePath?: LatLng[];
  fitRoute?: boolean;
  stops?: Stop[];
  /** Agrupa unidades cercanas en un solo marcador con contador (apagado por defecto). */
  cluster?: boolean;
  /** Píxeles del mapa tapados por un panel inferior: al centrar una unidad se compensan. */
  bottomInset?: number;
}

const BUS_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pinIcon(b: Bus, selected: boolean) {
  const s = occState(b.occupancy, b.max);
  return L.divIcon({
    className: "",
    iconSize: [136, 36],
    iconAnchor: [68, 18],
    html: `<div class="bus-pin s-${s}${selected ? " sel" : ""}">${BUS_SVG}<div><div class="t">L${esc(b.line)} · ${esc(b.internal)}</div><div class="o">${OCC_LABEL[s]} ${b.occupancy}/${b.max}</div></div></div>`,
  });
}

export default function LeafletMap({ buses, user, radiusKm, selectedId, onSelect, routePath, fitRoute, stops, cluster = false, bottomInset = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const extras = useRef<{ circle?: L.Circle; user?: L.Marker; route?: L.Polyline }>({});
  const fittedPath = useRef<LatLng[] | undefined>(undefined);
  const busesRef = useRef(buses);
  const onSelectRef = useRef(onSelect);
  const insetRef = useRef(bottomInset);

  useEffect(() => {
    busesRef.current = buses;
    onSelectRef.current = onSelect;
    insetRef.current = bottomInset;
  });

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).setView(user, 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    const marks = markers.current;
    // El contenedor cambia de tamaño (panel lateral, hoja inferior): el mapa se reajusta sin reiniciarse.
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(el.current!);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      marks.clear();
      extras.current = {};
      fittedPath.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    extras.current.circle?.remove();
    extras.current.user?.remove();
    extras.current.circle = L.circle(user, {
      radius: radiusKm * 1000,
      color: "#15803d",
      weight: 1.5,
      fillColor: "#16a34a",
      fillOpacity: 0.06,
    }).addTo(m);
    extras.current.user = L.marker(user, {
      icon: L.divIcon({ className: "", html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      interactive: false,
      keyboard: false,
    }).addTo(m);
  }, [user, radiusKm]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      // Con agrupación, las unidades que se solaparían en pantalla se funden en un contador; la seleccionada nunca se agrupa.
      const cells = new Map<string, Bus[]>();
      for (const b of buses) {
        const p = m.latLngToContainerPoint(b.pos);
        const key = !cluster || b.id === selectedId ? b.id : `${Math.floor(p.x / 120)}:${Math.floor(p.y / 44)}`;
        cells.set(key, [...(cells.get(key) ?? []), b]);
      }
      const seen = new Set<string>();
      for (const group of cells.values()) {
        if (group.length === 1) {
          const b = group[0];
          const sel = b.id === selectedId;
          seen.add(b.id);
          const existing = markers.current.get(b.id);
          if (existing) {
            existing.setLatLng(b.pos);
            existing.setIcon(pinIcon(b, sel));
            existing.setZIndexOffset(sel ? 1000 : 0);
          } else {
            const mk = L.marker(b.pos, { icon: pinIcon(b, sel), title: `Línea ${b.line}, interno ${b.internal}` }).addTo(m);
            mk.on("click", () => onSelectRef.current(b.id));
            markers.current.set(b.id, mk);
          }
        } else {
          const key = `cluster:${group.map((b) => b.id).sort().join("|")}`;
          seen.add(key);
          if (markers.current.has(key)) continue;
          const lat = group.reduce((sum, b) => sum + b.pos[0], 0) / group.length;
          const lng = group.reduce((sum, b) => sum + b.pos[1], 0) / group.length;
          const mk = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              html: `<div class="psj-cluster">${group.length}</div>`,
            }),
            title: `${group.length} unidades cercanas: acerca el mapa`,
          }).addTo(m);
          mk.on("click", () => m.fitBounds(L.latLngBounds(group.map((b) => b.pos)), { padding: [80, 80], maxZoom: 17 }));
          markers.current.set(key, mk);
        }
      }
      for (const [id, mk] of markers.current) {
        if (!seen.has(id)) {
          mk.remove();
          markers.current.delete(id);
        }
      }
    };
    draw();
    if (!cluster) return;
    m.on("zoomend", draw);
    return () => {
      m.off("zoomend", draw);
    };
  }, [buses, selectedId, cluster]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    extras.current.route?.remove();
    extras.current.route = routePath
      ? L.polyline(routePath, { color: "#15803d", weight: 4, opacity: 0.7 }).addTo(m)
      : undefined;
    if (!fitRoute || !routePath) {
      fittedPath.current = undefined;
    } else if (fittedPath.current !== routePath && extras.current.route) {
      m.fitBounds(extras.current.route.getBounds(), { padding: [24, 24], maxZoom: 16 });
      fittedPath.current = routePath;
    }
  }, [routePath, fitRoute]);

  useEffect(() => {
    const m = map.current;
    if (!m || !stops?.length) return;
    const layer = L.layerGroup().addTo(m);
    for (const stop of stops) {
      const content = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = stop.name;
      const detail = document.createElement("div");
      detail.textContent = `Línea ${stop.line} · Parada ${stop.order}`;
      content.append(name, detail);
      if (stop.reference) {
        const reference = document.createElement("div");
        reference.textContent = stop.reference;
        content.append(reference);
      }

      L.marker([stop.lat, stop.lng], {
        title: `Línea ${stop.line}: ${stop.name}`,
        icon: L.divIcon({
          className: "stop-pin",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        riseOnHover: true,
      }).bindPopup(content).addTo(layer);
    }
    return () => {
      layer.remove();
    };
  }, [stops]);

  useEffect(() => {
    const b = busesRef.current.find((x) => x.id === selectedId);
    const m = map.current;
    if (!b || !m) return;
    // Si una hoja inferior tapa parte del mapa, se centra en la zona que sigue visible.
    const inset = insetRef.current;
    m.panTo(inset ? m.unproject(m.project(b.pos).add([0, inset / 2])) : b.pos);
  }, [selectedId]);

  return <div ref={el} className="h-full w-full" />;
}
