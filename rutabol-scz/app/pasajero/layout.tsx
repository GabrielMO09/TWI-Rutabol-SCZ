"use client";

import type { ReactNode } from "react";
import { BadgeCheck, CreditCard, History, IdCard, Map, MessageSquareWarning, Receipt, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useApp } from "@/lib/store";

export default function PasajeroLayout({ children }: { children: ReactNode }) {
  const { unread, profile } = useApp();
  const nav = [
    { href: "/pasajero", label: "Mapa", icon: Map },
    { href: "/pasajero/pago", label: "Pagar", icon: Receipt },
    { href: "/pasajero/credicard", label: "Credicard", icon: CreditCard },
    { href: "/pasajero/historial", label: "Viajes", icon: History },
    { href: "/pasajero/carnet", label: "Carnet", icon: IdCard },
    ...(profile?.category !== "general" ? [{ href: "/pasajero/acreditacion", label: "Acreditación", icon: BadgeCheck }] : []),
    { href: "/pasajero/reclamos", label: "Reclamos", icon: MessageSquareWarning },
    { href: "/pasajero/perfil", label: "Perfil", icon: UserRound, badge: unread },
  ];
  return (
    <AppShell role="pasajero" nav={nav}>
      {children}
    </AppShell>
  );
}
