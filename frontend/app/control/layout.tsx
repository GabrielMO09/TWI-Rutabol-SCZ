"use client";

import type { ReactNode } from "react";
import {
  LayoutDashboard, BadgeCheck, MessageSquareWarning, TriangleAlert,
  Bus, Banknote, Users, ScrollText, FileDown, School, MapPin,
} from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import { useFetch } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { Overview } from "@/components/control/types";

export default function ControlLayout({ children }: { children: ReactNode }) {
  const { ready, profile } = useApp();
  const { data } = useFetch<Overview>(
    ready && profile?.role === "control" ? "/control/overview" : null,
    5000,
  );

  const nav: NavItem[] = [
    { href: "/control", label: "Resumen", icon: LayoutDashboard },
    { href: "/control/acreditaciones", label: "Acreditaciones", icon: BadgeCheck, badge: data?.kpis.acreditacionesPendientes },
    { href: "/control/reclamos", label: "Reclamos", icon: MessageSquareWarning },
    { href: "/control/incidentes", label: "Incidentes", icon: TriangleAlert },
    { href: "/control/flota", label: "Micro", icon: Bus },
    { href: "/control/paradas", label: "Paradas", icon: MapPin },
    { href: "/control/instituciones", label: "Instituciones", icon: School },
    { href: "/control/tarifas", label: "Tarifas", icon: Banknote },
    { href: "/control/usuarios", label: "Usuarios", icon: Users },
    { href: "/control/auditoria", label: "Auditoría", icon: ScrollText },
    { href: "/control/reportes", label: "Reportes", icon: FileDown },
  ];

  return <AppShell role="control" nav={nav}>{children}</AppShell>;
}
