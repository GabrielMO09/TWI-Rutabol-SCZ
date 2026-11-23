"use client";

import MapExplorer from "@/components/MapExplorer";
import PublicShell from "@/components/PublicShell";

export default function MapaPublico() {
  return (
    <PublicShell wide backHome>
      <MapExplorer mode="public" />
    </PublicShell>
  );
}
