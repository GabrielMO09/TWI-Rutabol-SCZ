"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OCC_LABEL, occState, type LatLng } from "@/lib/data";
import type { Bus } from "@/lib/store";

interface Props {
  buses: Bus[];
  user: LatLng;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  routePath?: LatLng[];
}

const BUS_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';

function pinIcon(b: Bus, selected: boolean) {
  const s = occState(b.occupancy, b.max);
  return L.divIcon({
    className: "",
    iconSize: [136, 36],
    iconAnchor: [68, 18],
    html: `<div class="bus-pin s-${s}${selected ? " sel" : ""}">${BUS_SVG}<div><div class="t">L${b.line} · ${b.internal}</div><div class="o">${OCC_LABEL[s]} ${b.occupancy}/${b.max}</div></div></div>`,
  });
}

export default function LeafletMap({ buses, user, radiusKm, selectedId, onSelect, routePath }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const extras = useRef<{ circle?: L.Circle; user?: L.Marker; route?: L.Polyline }>({});
  const busesRef = useRef(buses);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    busesRef.current = buses;
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).setView(user, 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    const marks = markers.current;
    return () => {
      m.remove();
      map.current = null;
      marks.clear();
      extras.current = {};
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
    }).addTo(m);
  }, [user, radiusKm]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const b of buses) {
      seen.add(b.id);
      const sel = b.id === selectedId;
      const existing = markers.current.get(b.id);
      if (existing) {
        existing.setLatLng(b.pos);
        existing.setIcon(pinIcon(b, sel));
        existing.setZIndexOffset(sel ? 1000 : 0);
      } else {
        const mk = L.marker(b.pos, { icon: pinIcon(b, sel) }).addTo(m);
        mk.on("click", () => onSelectRef.current(b.id));
        markers.current.set(b.id, mk);
      }
    }
    for (const [id, mk] of markers.current) {
      if (!seen.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    }
  }, [buses, selectedId]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    extras.current.route?.remove();
    extras.current.route = routePath
      ? L.polyline(routePath, { color: "#15803d", weight: 4, opacity: 0.7 }).addTo(m)
      : undefined;
  }, [routePath]);

  useEffect(() => {
    const b = busesRef.current.find((x) => x.id === selectedId);
    if (b) map.current?.panTo(b.pos);
  }, [selectedId]);

  return <div ref={el} className="h-full w-full" />;
}
