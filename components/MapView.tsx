"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-soft text-sm text-muted">
      Cargando mapa...
    </div>
  ),
});

export default MapView;
