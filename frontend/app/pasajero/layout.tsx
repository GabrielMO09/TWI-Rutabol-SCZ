"use client";

import type { ReactNode } from "react";
import { BadgeCheck, CreditCard, History, IdCard, LayoutGrid, Map, MessageSquareWarning, Receipt, UserRound } from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import { useApp } from "@/lib/store";

export default function PasajeroLayout({ children }: { children: ReactNode }) {
  const { profile } = useApp();
  const viaje: NavItem[] = [
    { href: "/pasajero", label: "Mapa", icon: Map },
    { href: "/pasajero/credicard", label: "Credicard", icon: CreditCard },
    { href: "/pasajero/pago", label: "Pagar", icon: Receipt },
  ];
  const mas: NavItem[] = [
    { href: "/pasajero/historial", label: "Viajes", icon: History },
    { href: "/pasajero/carnet", label: "Carnet", icon: IdCard },
    ...(profile?.category !== "general" ? [{ href: "/pasajero/acreditacion", label: "Acreditación", icon: BadgeCheck }] : []),
    { href: "/pasajero/reclamos", label: "Reclamos", icon: MessageSquareWarning },
  ];
  const nav: NavItem[] = [
    { href: "/pasajero", label: "Viaje", icon: Map, children: viaje },
    { href: mas[0].href, label: "Más", icon: LayoutGrid, children: mas },
    { href: "/pasajero/perfil", label: "Perfil", icon: UserRound },
  ];
  return (
    <AppShell role="pasajero" nav={nav}>
      {children}
    </AppShell>
  );
}
