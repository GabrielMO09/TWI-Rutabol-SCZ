
"use client";

import dynamic from "next/dynamic";

import {
  BusFront,
  LoaderCircle,
  MapPin,
} from "lucide-react";

/* =========================================
   PANTALLA DE CARGA DEL MAPA
========================================= */

function MapLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando mapa de transporte"
      className="relative isolate flex h-full w-full items-center justify-center overflow-hidden bg-[#f1f5f2] p-5"
    >

      {/* Fondo decorativo */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, #dce5df 1px, transparent 1px), linear-gradient(to bottom, #dce5df 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/40 blur-3xl"
      />

      {/* Tarjeta de carga */}

      <div className="animate-fade-up relative flex w-full max-w-[340px] flex-col items-center rounded-[28px] border border-emerald-100 bg-white/95 p-8 text-center shadow-xl backdrop-blur-md">

        <div className="relative mb-6">

          <div className="absolute inset-0 animate-ping rounded-3xl bg-emerald-200 opacity-40" />

          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-600 to-emerald-900 text-white shadow-lg">

            <MapPin
              size={38}
              aria-hidden="true"
            />

          </div>

        </div>

        <div className="mb-3 flex items-center gap-2 text-emerald-700">

          <BusFront
            size={18}
            aria-hidden="true"
          />

          <span className="text-xs font-extrabold tracking-widest">
            RUTABOL-SCZ
          </span>

        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
          Preparando el mapa
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Estamos inicializando el mapa
          de transporte urbano.
        </p>

        {/* Indicador de carga */}

        <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">

          <LoaderCircle
            size={20}
            aria-hidden="true"
            className="animate-spin text-emerald-600"
          />

          <span className="text-xs font-semibold text-emerald-800">
            Cargando mapa...
          </span>

        </div>

        <p className="mt-5 text-[10px] font-medium text-slate-400">
          Plataforma de movilidad urbana
        </p>

      </div>

    </div>
  );
}

/* =========================================
   IMPORTACIÓN DINÁMICA DE LEAFLET
========================================= */

const MapView = dynamic(
  () => import("./LeafletMap"),
  {
    ssr: false,
    loading: () => <MapLoading />,
  }
);

export default MapView;
