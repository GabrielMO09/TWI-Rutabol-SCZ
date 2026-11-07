"use client";

import type { ReactNode } from "react";
import { IdCard, Map, Receipt } from "lucide-react";
import AppShell from "@/components/AppShell";

const NAV = [
  { href: "/pasajero", label: "Mapa", icon: Map },
  { href: "/pasajero/pago", label: "Pagar", icon: Receipt },
  { href: "/pasajero/carnet", label: "Carnet", icon: IdCard },
];

export default function PasajeroLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="pasajero" nav={NAV}>
      {children}
    </AppShell>
  );
}
