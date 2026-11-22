import Link from "next/link";
import { Bus, ChevronRight, GraduationCap, LayoutDashboard, Map } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";

const ROLES = [
  {
    href: "/acceso/pasajero",
    icon: GraduationCap,
    title: "Estudiante o pasajero",
    text: "Ubica micros, paga tu pasaje y muestra tu carnet digital.",
  },
  {
    href: "/mapa",
    icon: Map,
    title: "Solo consultar rutas (sin cuenta)",
    text: "Mira líneas, tarifas, micros cercanos y estado del servicio.",
  },
  {
    href: "/acceso/chofer",
    icon: Bus,
    title: "Chofer",
    text: "Controla el aforo, valida pasajeros y gestiona trasbordos.",
  },
  {
    href: "/acceso/control",
    icon: LayoutDashboard,
    title: "Centro de Control",
    text: "Vista completa del sistema: qué funciona, qué falla y la gestión de los micros.",
  },
];

export default function Acceso() {
  return (
    <AuthFrame title="¿Cómo vas a ingresar?" subtitle="Cada perfil tiene su propio inicio de sesión." back="/">
      <div className="flex flex-col gap-3">
        {ROLES.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-4 p-4 transition-colors hover:border-brand hover:bg-soft"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-soft text-brand">
              <Icon size={24} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{title}</span>
              <span className="block text-sm text-muted">{text}</span>
            </span>
            <ChevronRight className="text-muted" size={20} />
          </Link>
        ))}
      </div>
    </AuthFrame>
  );
}
