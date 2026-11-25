
"use client";

import {
  useEffect,
  useRef,
} from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  OCC_LABEL,
  occState,
  type LatLng,
} from "@/lib/data";

import type { Stop } from "@/lib/routes";
import type { Bus } from "@/lib/store";

/* =========================================
   PROPIEDADES DEL MAPA
========================================= */

interface Props {
  buses: Bus[];
  user: LatLng;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  routePath?: LatLng[];
  fitRoute?: boolean;
  stops?: Stop[];
  cluster?: boolean;
  bottomInset?: number;
}

interface MapExtras {
  circle?: L.Circle;
  user?: L.Marker;
  route?: L.Polyline;
  routeOutline?: L.Polyline;
}

/* =========================================
   COLORES SEGÚN OCUPACIÓN
========================================= */

const OCC_COLORS = {
  disponible: "#047857",
  moderado: "#4d7c0f",
  "casi-lleno": "#b45309",
  lleno: "#b91c1c",
} as const;

/* =========================================
   ICONOS SVG
========================================= */

const BUS_SVG = `
  <svg
    width="23"
    height="23"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 17h14"/>
    <path d="M5 17v2"/>
    <path d="M19 17v2"/>
    <rect x="4" y="3" width="16" height="15" rx="4"/>
    <path d="M4 11h16"/>
    <path d="M12 3v8"/>
    <path d="M2 8v4"/>
    <path d="M22 8v4"/>
    <circle cx="8" cy="15" r="1"/>
    <circle cx="16" cy="15" r="1"/>
  </svg>
`;

const STOP_SVG = `
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.3"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="3" width="14" height="15" rx="3"/>
    <path d="M5 11h14"/>
    <path d="M8 18v3"/>
    <path d="M16 18v3"/>
    <path d="M8 15h.01"/>
    <path d="M16 15h.01"/>
  </svg>
`;

/* =========================================
   ESTILOS PERSONALIZADOS DE LEAFLET
========================================= */

const MAP_STYLES = `
  .rutabol-leaflet {
    background: #edf1ee;
    font-family: var(--font-inter), Arial, sans-serif;
  }

  /* MARCADORES DE MICROS */

  .rb-bus-marker {
    background: transparent;
    border: none;
  }

  .rb-bus-pin {
    position: relative;
    display: flex;
    align-items: center;
    gap: 7px;
    width: 156px;
    height: 48px;
    box-sizing: border-box;
    padding: 5px;
    background: #ffffff;
    border: 1.5px solid var(--rb-bus-color);
    border-radius: 12px;
    box-shadow: 0 3px 12px rgba(15, 23, 42, .15);
    cursor: pointer;
    transition:
      box-shadow .2s ease,
      background .2s ease,
      transform .2s ease;
  }

  .rb-bus-pin:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, .22);
  }

  .rb-bus-pin.rb-selected {
    background: #f0fdf4;
    border-width: 2px;
    box-shadow:
      0 0 0 4px rgba(16, 185, 129, .22),
      0 6px 20px rgba(15, 23, 42, .18);
  }

  .rb-bus-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 8px;
    color: white;
    background: var(--rb-bus-color);
  }

  .rb-bus-info {
    min-width: 0;
    flex: 1;
  }

  .rb-bus-title {
    overflow: hidden;
    color: #0f172a;
    font-size: 12px;
    font-weight: 800;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .rb-bus-occupancy {
    overflow: hidden;
    margin-top: 2px;
    color: var(--rb-bus-color);
    font-size: 9px;
    font-weight: 700;
    line-height: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .rb-bus-selected-dot {
    position: absolute;
    right: -5px;
    top: -5px;
    width: 12px;
    height: 12px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 2px 5px rgba(15, 23, 42, .2);
  }

  /* AGRUPACIÓN DE MICROS */

  .rb-cluster-marker {
    background: transparent;
    border: none;
  }

  .rb-cluster {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 46px;
    height: 46px;
    border: 3px solid #ffffff;
    border-radius: 50%;
    color: #ffffff;
    background: #047857;
    box-shadow:
      0 0 0 6px rgba(16, 185, 129, .18),
      0 4px 12px rgba(15, 23, 42, .2);
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform .2s ease,
      background .2s ease;
  }

  .rb-cluster:hover {
    transform: scale(1.1);
    background: #064e3b;
  }

  /* UBICACIÓN DEL PASAJERO */

  .rb-user-marker {
    background: transparent;
    border: none;
  }

  .rb-user-location {
    position: relative;
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
  }

  .rb-user-location::before {
    position: absolute;
    inset: -9px;
    content: "";
    border-radius: 50%;
    background: rgba(37, 99, 235, .15);
    animation: rb-location-pulse 2.5s infinite;
  }

  .rb-user-location span {
    position: relative;
    width: 19px;
    height: 19px;
    border: 3px solid white;
    border-radius: 50%;
    background: #2563eb;
    box-shadow: 0 2px 8px rgba(37, 99, 235, .35);
  }

  @keyframes rb-location-pulse {
    0%, 100% {
      transform: scale(.85);
      opacity: .7;
    }

    50% {
      transform: scale(1.2);
      opacity: .3;
    }
  }

  /* PARADAS DE TRANSPORTE */

  .rb-stop-marker {
    background: transparent;
    border: none;
  }

  .rb-stop-pin {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    box-sizing: border-box;
    border: 2px solid #047857;
    border-radius: 9px;
    color: #047857;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .16);
    cursor: pointer;
    transition: transform .2s ease;
  }

  .rb-stop-pin:hover {
    transform: scale(1.15);
  }

  /* VENTANAS EMERGENTES */

  .rutabol-leaflet .rb-stop-popup
  .leaflet-popup-content-wrapper {
    padding: 0;
    overflow: hidden;
    border: 1px solid #dce5e2;
    border-radius: 16px;
    background: white;
    box-shadow: 0 12px 30px rgba(15, 23, 42, .16);
  }

  .rutabol-leaflet .rb-stop-popup
  .leaflet-popup-content {
    margin: 0;
    line-height: 1.5;
  }

  .rutabol-leaflet .rb-stop-popup
  .leaflet-popup-tip {
    background: white;
    box-shadow: none;
  }

  .rutabol-leaflet .rb-stop-popup
  .leaflet-popup-close-button {
    width: 28px;
    height: 28px;
    top: 7px;
    right: 7px;
    color: #ffffff;
    font-size: 21px;
  }

  .rb-popup-header {
    padding: 13px 36px 13px 15px;
    background: #047857;
    color: #ffffff;
  }

  .rb-popup-type {
    color: #d1fae5;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .rb-popup-title {
    display: block;
    margin-top: 4px;
    font-size: 14px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .rb-popup-body {
    padding: 14px 15px;
    color: #475569;
    font-size: 12px;
  }

  .rb-popup-line {
    color: #047857;
    font-weight: 800;
  }

  .rb-popup-reference {
    margin-top: 10px;
    padding: 10px;
    border-radius: 9px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  /* CONTROLES DE ZOOM */

  .rutabol-leaflet .leaflet-top
  .leaflet-control {
    margin-top: 14px;
  }

  .rutabol-leaflet .leaflet-left
  .leaflet-control {
    margin-left: 14px;
  }

  .rutabol-leaflet .leaflet-control-zoom {
    overflow: hidden;
    border: 1px solid #dce5e2;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, .12);
  }

  .rutabol-leaflet .leaflet-control-zoom a {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 39px;
    height: 39px;
    line-height: 39px;
    border-bottom-color: #e2e8f0;
    background: #ffffff;
    color: #334155;
    font-size: 23px;
    font-weight: 600;
    transition:
      background .2s ease,
      color .2s ease;
  }

  .rutabol-leaflet .leaflet-control-zoom a:hover {
    background: #ecfdf5;
    color: #047857;
  }

  .rutabol-leaflet .leaflet-control-zoom a.leaflet-disabled {
    background: #f8fafc;
    color: #cbd5e1;
  }

  /* ATRIBUCIÓN DEL MAPA */

  .rutabol-leaflet .leaflet-control-attribution {
    padding: 3px 7px;
    background: rgba(255, 255, 255, .92);
    color: #64748b;
    font-size: 10px;
  }

  .rutabol-leaflet .leaflet-control-attribution a {
    color: #047857;
  }

  /* LEYENDA DEL MAPA */

  .rb-map-legend {
    min-width: 145px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: rgba(255, 255, 255, .96);
    box-shadow: 0 4px 16px rgba(15, 23, 42, .12);
  }

  .rb-legend-title {
    margin-bottom: 9px;
    color: #0f172a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .5px;
    text-transform: uppercase;
  }

  .rb-legend-row {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 6px;
    color: #475569;
    font-size: 10px;
    font-weight: 500;
  }

  .rb-legend-dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .rb-legend-toggle {
    margin-top: 9px;
    padding: 5px;
    width: 100%;
    color: #047857;
    background: #ecfdf5;
    border: none;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }

  .rb-legend-collapsed .rb-legend-content {
    display: none;
  }

  .rb-legend-collapsed {
    min-width: auto;
  }

  .rb-legend-collapsed .rb-legend-title {
    margin-bottom: 0;
  }

  /* DISEÑO RESPONSIVE */

  @media (max-width: 767px) {
    .rutabol-leaflet .rb-map-legend {
      display: none;
    }

    .rutabol-leaflet .leaflet-control-zoom a {
      width: 34px;
      height: 34px;
      font-size: 21px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rutabol-leaflet .rb-user-location::before {
      animation: none;
    }

    .rutabol-leaflet .rb-bus-pin,
    .rutabol-leaflet .rb-cluster,
    .rutabol-leaflet .rb-stop-pin {
      transition: none;
    }
  }
`;

/* =========================================
   ESCAPAR CONTENIDO HTML
========================================= */

function esc(value: string | number) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      `&#${character.charCodeAt(0)};`
  );
}

/* =========================================
   MARCADOR DE MICRO
========================================= */

function pinIcon(
  bus: Bus,
  selected: boolean
) {
  const state = occState(
    bus.occupancy,
    bus.max
  );

  const color = OCC_COLORS[state];

  const occupancy = OCC_LABEL[state];

  return L.divIcon({
    className: "rb-bus-marker",

    iconSize: [156, 48],

    iconAnchor: [78, 24],

    html: `
      <div
        class="rb-bus-pin${selected ? " rb-selected" : ""}"
        style="--rb-bus-color: ${color}"
      >

        <div class="rb-bus-icon">
          ${BUS_SVG}
        </div>

        <div class="rb-bus-info">

          <div class="rb-bus-title">
            L${esc(bus.line)} · ${esc(bus.internal)}
          </div>

          <div class="rb-bus-occupancy">
            ${esc(occupancy)}
            ·
            ${esc(bus.occupancy)}/${esc(bus.max)}
          </div>

        </div>

        ${
          selected
            ? '<span class="rb-bus-selected-dot"></span>'
            : ""
        }

      </div>
    `,
  });
}

/* =========================================
   MARCADOR DE AGRUPACIÓN
========================================= */

function clusterIcon(count: number) {
  return L.divIcon({
    className: "rb-cluster-marker",

    iconSize: [46, 46],

    iconAnchor: [23, 23],

    html: `
      <div class="rb-cluster">
        ${esc(count)}
      </div>
    `,
  });
}

/* =========================================
   MARCADOR DE UBICACIÓN
========================================= */

function userIcon() {
  return L.divIcon({
    className: "rb-user-marker",

    iconSize: [24, 24],

    iconAnchor: [12, 12],

    html: `
      <div class="rb-user-location">
        <span></span>
      </div>
    `,
  });
}

/* =========================================
   MARCADOR DE PARADA
========================================= */

function stopIcon() {
  return L.divIcon({
    className: "rb-stop-marker",

    iconSize: [26, 26],

    iconAnchor: [13, 13],

    popupAnchor: [0, -15],

    html: `
      <div class="rb-stop-pin">
        ${STOP_SVG}
      </div>
    `,
  });
}

/* =========================================
   VENTANA EMERGENTE DE PARADA
========================================= */

function createStopPopup(stop: Stop) {
  const content =
    document.createElement("div");

  const header =
    document.createElement("div");

  header.className = "rb-popup-header";

  const type =
    document.createElement("div");

  type.className = "rb-popup-type";

  type.textContent = "Parada de transporte";

  const name =
    document.createElement("strong");

  name.className = "rb-popup-title";

  name.textContent = stop.name;

  header.append(type, name);

  const body =
    document.createElement("div");

  body.className = "rb-popup-body";

  const line =
    document.createElement("div");

  line.className = "rb-popup-line";

  line.textContent =
    `Línea ${stop.line}`;

  const order =
    document.createElement("div");

  order.textContent =
    `Parada número ${stop.order}`;

  body.append(line, order);

  if (stop.reference) {
    const reference =
      document.createElement("div");

    reference.className =
      "rb-popup-reference";

    reference.textContent =
      stop.reference;

    body.append(reference);
  }

  content.append(header, body);

  return content;
}

/* =========================================
   LEYENDA DE OCUPACIÓN
========================================= */

function createLegend(map: L.Map) {
  const control = new L.Control({
    position: "bottomleft",
  });

  control.onAdd = () => {
    const container = L.DomUtil.create(
      "div",
      "rb-map-legend"
    );

    const title = L.DomUtil.create(
      "div",
      "rb-legend-title",
      container
    );

    title.textContent = "Estado de micros";

    const content = L.DomUtil.create(
      "div",
      "rb-legend-content",
      container
    );

    const items = [
      {
        label: "Disponible",
        color: OCC_COLORS.disponible,
      },
      {
        label: "Moderado",
        color: OCC_COLORS.moderado,
      },
      {
        label: "Casi lleno",
        color: OCC_COLORS["casi-lleno"],
      },
      {
        label: "Lleno",
        color: OCC_COLORS.lleno,
      },
      {
        label: "Punto de referencia",
        color: "#2563eb",
      },
    ];

    for (const item of items) {
      const row = L.DomUtil.create(
        "div",
        "rb-legend-row",
        content
      );

      const dot = L.DomUtil.create(
        "span",
        "rb-legend-dot",
        row
      );

      dot.style.backgroundColor =
        item.color;

      const label =
        document.createElement("span");

      label.textContent = item.label;

      row.append(label);
    }

    const toggle = L.DomUtil.create(
      "button",
      "rb-legend-toggle",
      container
    );

    toggle.type = "button";

    toggle.textContent = "Ocultar leyenda";

    toggle.setAttribute(
      "aria-expanded",
      "true"
    );

    toggle.addEventListener("click", () => {
      const collapsed =
        container.classList.toggle(
          "rb-legend-collapsed"
        );

      toggle.textContent = collapsed
        ? "Mostrar leyenda"
        : "Ocultar leyenda";

      toggle.setAttribute(
        "aria-expanded",
        String(!collapsed)
      );
    });

    L.DomEvent.disableClickPropagation(
      container
    );

    L.DomEvent.disableScrollPropagation(
      container
    );

    return container;
  };

  control.addTo(map);

  return control;
}

/* =========================================
   CALCULAR CENTRO DE UNA AGRUPACIÓN
========================================= */

function clusterCenter(
  group: Bus[]
): L.LatLngTuple {
  const latitude =
    group.reduce(
      (sum, bus) => sum + bus.pos[0],
      0
    ) / group.length;

  const longitude =
    group.reduce(
      (sum, bus) => sum + bus.pos[1],
      0
    ) / group.length;

  return [latitude, longitude];
}

/* =========================================
   COMPENSAR PANEL INFERIOR
========================================= */

function safeInset(
  map: L.Map,
  inset: number
) {
  return Math.max(
    0,
    Math.min(
      inset,
      map.getSize().y - 80
    )
  );
}

/* =========================================
   COMPONENTE PRINCIPAL DEL MAPA
========================================= */

export default function LeafletMap({
  buses,
  user,
  radiusKm,
  selectedId,
  onSelect,
  routePath,
  fitRoute,
  stops,
  cluster = false,
  bottomInset = 0,
}: Props) {
  const el =
    useRef<HTMLDivElement>(null);

  const map =
    useRef<L.Map | null>(null);

  const markers = useRef(
    new Map<string, L.Marker>()
  );

  const extras =
    useRef<MapExtras>({});

  const fittedPath =
    useRef<LatLng[] | undefined>(
      undefined
    );

  const fittedInset =
    useRef<number>(0);

  const initialUser =
    useRef(user);

  const busesRef =
    useRef(buses);

  const onSelectRef =
    useRef(onSelect);

  /* =====================================
     ACTUALIZAR REFERENCIAS
  ===================================== */

  useEffect(() => {
    busesRef.current = buses;

    onSelectRef.current = onSelect;

  }, [buses, onSelect]);

  /* =====================================
     INICIALIZAR MAPA
  ===================================== */

  useEffect(() => {
    const element = el.current;

    if (!element) return;

    const m = L.map(element, {
      zoomControl: false,
      attributionControl: true,
    }).setView(initialUser.current, 13);

    /* Mapa base original */

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,

        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(m);

    /* Controles personalizados */

    L.control.zoom({
      position: "topleft",
      zoomInTitle: "Acercar mapa",
      zoomOutTitle: "Alejar mapa",
    }).addTo(m);

    /* Leyenda interactiva */

    const legend = createLegend(m);

    map.current = m;

    const marks = markers.current;

    /* ===================================
       AJUSTE AUTOMÁTICO DE DIMENSIONES
    =================================== */

    let frame: number | null = null;

    const resize = new ResizeObserver(() => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        m.invalidateSize({
          animate: false,
          pan: false,
          debounceMoveend: true,
        });

        frame = null;
      });
    });

    resize.observe(element);

    /* Liberar recursos */

    return () => {
      resize.disconnect();

      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      legend.remove();

      m.remove();

      marks.clear();

      map.current = null;

      extras.current = {};

      fittedPath.current = undefined;

      fittedInset.current = 0;
    };

  }, []);

  /* =====================================
     UBICACIÓN Y RADIO DE BÚSQUEDA
  ===================================== */

  const userLat = user[0];

  const userLng = user[1];

  useEffect(() => {
    const m = map.current;

    if (!m) return;

    const position: L.LatLngTuple = [
      userLat,
      userLng,
    ];

    /* Círculo del radio de búsqueda */

    if (extras.current.circle) {
      extras.current.circle
        .setLatLng(position)
        .setRadius(radiusKm * 1000);
    } else {
      extras.current.circle = L.circle(
        position,
        {
          radius: radiusKm * 1000,

          color: "#059669",

          weight: 1.5,

          opacity: 0.65,

          dashArray: "7 6",

          fillColor: "#10b981",

          fillOpacity: 0.045,

          interactive: false,
        }
      ).addTo(m);
    }

    /* Marcador de referencia */

    if (extras.current.user) {
      extras.current.user.setLatLng(
        position
      );
    } else {
      extras.current.user = L.marker(
        position,
        {
          icon: userIcon(),

          interactive: false,

          keyboard: false,

          zIndexOffset: 500,
        }
      ).addTo(m);
    }

  }, [
    userLat,
    userLng,
    radiusKm,
  ]);

  /* =====================================
     RENDERIZAR MICROS Y AGRUPACIONES
  ===================================== */

  useEffect(() => {
    const m = map.current;

    if (!m) return;

    function draw() {
      if (!m) return;

      const cells =
        new Map<string, Bus[]>();

      /* Agrupar unidades cercanas */

      for (const bus of buses) {
        const point =
          m.latLngToContainerPoint(
            bus.pos
          );

        const key =
          !cluster ||
          bus.id === selectedId
            ? `bus:${bus.id}`
            : `cell:${Math.floor(point.x / 156)}:${Math.floor(point.y / 52)}`;

        const existing = cells.get(key);

        if (existing) {
          existing.push(bus);
        } else {
          cells.set(key, [bus]);
        }
      }

      const seen =
        new Set<string>();

      for (const group of cells.values()) {

        /* =============================
           MARCADOR INDIVIDUAL
        ============================= */

        if (group.length === 1) {
          const bus = group[0];

          const selected =
            bus.id === selectedId;

          const markerKey =
            `bus:${bus.id}`;

          seen.add(markerKey);

          const title =
            `Línea ${bus.line}, interno ${bus.internal}`;

          const existing =
            markers.current.get(
              markerKey
            );

          if (existing) {
            existing.setLatLng(bus.pos);

            existing.setIcon(
              pinIcon(bus, selected)
            );

            existing.setZIndexOffset(
              selected ? 1500 : 0
            );

            existing.options.title =
              title;

            existing
              .getElement()
              ?.setAttribute(
                "title",
                title
              );

            existing
              .getElement()
              ?.setAttribute(
                "aria-label",
                title
              );

          } else {
            const marker = L.marker(
              bus.pos,
              {
                icon: pinIcon(
                  bus,
                  selected
                ),

                title,

                keyboard: true,

                riseOnHover: true,

                zIndexOffset:
                  selected ? 1500 : 0,
              }
            ).addTo(m);

            marker
              .getElement()
              ?.setAttribute(
                "aria-label",
                title
              );

            marker.on("click", () => {
              onSelectRef.current(
                bus.id
              );
            });

            markers.current.set(
              markerKey,
              marker
            );
          }

          continue;
        }

        /* =============================
           AGRUPACIÓN DE VARIOS MICROS
        ============================= */

        const groupIds = group
          .map((bus) => bus.id)
          .sort();

        const markerKey =
          `cluster:${JSON.stringify(groupIds)}`;

        seen.add(markerKey);

        const center =
          clusterCenter(group);

        const existing =
          markers.current.get(
            markerKey
          );

        const title =
          `${group.length} unidades cercanas. Acerca el mapa.`;

        /*
         * El grupo utiliza las posiciones
         * más recientes al hacer clic.
         */

        function expandCluster() {
          if (!m) return;

          const currentBuses =
            busesRef.current.filter(
              (bus) =>
                groupIds.includes(bus.id)
            );

          if (!currentBuses.length) return;

          const bounds = L.latLngBounds(
            currentBuses.map(
              (bus) => bus.pos
            )
          );

          /*
           * Si las unidades están en
           * coordenadas idénticas, permite
           * seleccionar una desde el panel.
           */

          if (
            bounds.getNorthEast().equals(
              bounds.getSouthWest()
            )
          ) {
            m.setView(
              bounds.getCenter(),
              Math.max(m.getZoom(), 17)
            );

            return;
          }

          m.fitBounds(bounds, {
            paddingTopLeft: [50, 50],

            paddingBottomRight: [
              50,
              50 + safeInset(
                m,
                bottomInset
              ),
            ],

            maxZoom: 17,
          });
        }

        if (existing) {
          /*
           * Corrección importante:
           * actualizar el centro del grupo
           * cuando los micros se desplazan.
           */

          existing.setLatLng(center);

          existing.options.title =
            title;

          existing
            .getElement()
            ?.setAttribute(
              "title",
              title
            );

          existing
            .getElement()
            ?.setAttribute(
              "aria-label",
              title
            );

          existing.off("click");

          existing.on(
            "click",
            expandCluster
          );

        } else {
          const marker = L.marker(
            center,
            {
              icon: clusterIcon(
                group.length
              ),

              title,

              keyboard: true,

              riseOnHover: true,

              zIndexOffset: 100,
            }
          ).addTo(m);

          marker
            .getElement()
            ?.setAttribute(
              "aria-label",
              title
            );

          marker.on(
            "click",
            expandCluster
          );

          markers.current.set(
            markerKey,
            marker
          );
        }
      }

      /* Eliminar marcadores obsoletos */

      for (
        const [id, marker]
        of markers.current
      ) {
        if (!seen.has(id)) {
          marker.remove();

          markers.current.delete(id);
        }
      }
    }

    draw();

    /* Recalcular grupos al mover el mapa */

    if (!cluster) return;

    m.on(
      "zoomend moveend resize",
      draw
    );

    return () => {
      m.off(
        "zoomend moveend resize",
        draw
      );
    };

  }, [
    buses,
    selectedId,
    cluster,
    bottomInset,
  ]);

  /* =====================================
     DIBUJAR RECORRIDO DE LA LÍNEA
  ===================================== */

  useEffect(() => {
    const m = map.current;

    if (!m) return;

    extras.current.route?.remove();

    extras.current.routeOutline?.remove();

    extras.current.route = undefined;

    extras.current.routeOutline =
      undefined;

    if (
      !routePath ||
      routePath.length === 0
    ) {
      return;
    }

    /* Borde blanco del recorrido */

    extras.current.routeOutline =
      L.polyline(routePath, {
        color: "#ffffff",

        weight: 9,

        opacity: 0.9,

        lineCap: "round",

        lineJoin: "round",

        interactive: false,
      }).addTo(m);

    /* Línea principal del recorrido */

    extras.current.route =
      L.polyline(routePath, {
        color: "#047857",

        weight: 5,

        opacity: 0.95,

        lineCap: "round",

        lineJoin: "round",

        interactive: false,
      }).addTo(m);

    return () => {
      extras.current.route?.remove();

      extras.current.routeOutline?.remove();

      extras.current.route = undefined;

      extras.current.routeOutline =
        undefined;
    };

  }, [routePath]);

  /* =====================================
     AJUSTAR VISTA AL RECORRIDO
  ===================================== */

  useEffect(() => {
    const m = map.current;

    if (!m) return;

    if (
      !fitRoute ||
      !routePath?.length
    ) {
      fittedPath.current = undefined;

      return;
    }

    const route = extras.current.route;

    if (!route) return;

    if (
      fittedPath.current === routePath &&
      fittedInset.current === bottomInset
    ) {
      return;
    }

    const bounds = route.getBounds();

    if (!bounds.isValid()) return;

    m.fitBounds(bounds, {
      paddingTopLeft: [32, 32],

      paddingBottomRight: [
        32,
        32 + safeInset(m, bottomInset),
      ],

      maxZoom: 16,
    });

    fittedPath.current = routePath;

    fittedInset.current = bottomInset;

  }, [
    routePath,
    fitRoute,
    bottomInset,
  ]);

  /* =====================================
     MOSTRAR PARADAS DE TRANSPORTE
  ===================================== */

  useEffect(() => {
    const m = map.current;

    if (!m || !stops?.length) return;

    const layer =
      L.layerGroup().addTo(m);

    for (const stop of stops) {
      const title =
        `Línea ${stop.line}: ${stop.name}`;

      const marker = L.marker(
        [stop.lat, stop.lng],
        {
          title,

          icon: stopIcon(),

          riseOnHover: true,

          keyboard: true,
        }
      );

      marker.bindPopup(
        createStopPopup(stop),
        {
          className: "rb-stop-popup",

          minWidth: 210,

          maxWidth: 290,

          closeButton: true,

          autoPan: true,
        }
      );

      marker.addTo(layer);

      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          title
        );
    }

    return () => {
      layer.remove();
    };

  }, [stops]);

  /* =====================================
     CENTRAR UNIDAD SELECCIONADA
  ===================================== */

  useEffect(() => {
    const m = map.current;

    if (!m || !selectedId) return;

    const bus =
      busesRef.current.find(
        (item) =>
          item.id === selectedId
      );

    if (!bus) return;

    const inset = safeInset(
      m,
      bottomInset
    );

    /*
     * Desplazar la unidad hacia la parte
     * visible cuando hay un panel inferior.
     */

    if (inset > 0) {
      const point = m
        .project(bus.pos)
        .add([0, inset / 2]);

      m.panTo(
        m.unproject(point),
        {
          animate: true,
          duration: 0.35,
        }
      );
    } else {
      m.panTo(bus.pos, {
        animate: true,
        duration: 0.35,
      });
    }

  }, [
    selectedId,
    bottomInset,
  ]);

  /* =====================================
     RENDERIZADO PRINCIPAL
  ===================================== */

  return (
    <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">

      <style>{MAP_STYLES}</style>

      <div
        ref={el}
        aria-label="Mapa interactivo de transporte urbano"
        className="rutabol-leaflet h-full w-full"
      />

    </div>
  );
}
