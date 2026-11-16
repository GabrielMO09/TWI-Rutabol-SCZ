"use client";

import type { ReactNode } from "react";
import { Gauge, Repeat, ScanFace, TriangleAlert } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useApp } from "@/lib/store";

export default function ChoferLayout({ children }: { children: ReactNode }) {
  const { world, profile } = useApp();
  const pending = world.reqs.filter((r) => r.busId === profile?.busId).length;
  return (
    <AppShell
      role="chofer"
      nav={[
        { href: "/chofer", label: "Jornada y aforo", icon: Gauge },
        { href: "/chofer/validacion", label: "Validar y cobrar", icon: ScanFace, badge: pending },
        { href: "/chofer/incidentes", label: "Incidentes", icon: TriangleAlert },
        { href: "/chofer/trasbordo", label: "Trasbordos", icon: Repeat },
      ]}
    >
      {children}
    </AppShell>
  );
}
