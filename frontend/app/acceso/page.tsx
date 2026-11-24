import Link from "next/link";
import { Bus, ChevronRight, GraduationCap, LayoutDashboard } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";

const ROLES = [
  {
    href: "/acceso/pasajero",
    icon: GraduationCap,
    title: "Estudiante o pasajero",
    text: "Ubica micros, paga tu pasaje y muestra tu carnet digital.",
  },
  {
    href: "/acceso/chofer",
    icon: Bus,
    title: "Conductor",
    text: "Controla el aforo, valida pasajeros y gestiona trasbordos.",
  },
  {
    href: "/acceso/control",
    icon: LayoutDashboard,
    title: "Centro de Control",
    text: "Supervisa el sistema y gestiona la flota y el servicio.",
  },
];

function RoleCard({ href, icon: Icon, title, text }: (typeof ROLES)[number]) {
  return (
    <Link
      href={href}
      className="psj-card group flex min-h-[88px] items-center gap-4 p-4 transition-all duration-200 hover:border-(--psj-green) hover:bg-(--psj-green-soft) active:scale-[0.99] active:bg-(--psj-green-soft)"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-(--psj-green-soft) text-(--psj-green) transition-colors group-hover:bg-white">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-(--psj-muted-strong)">{text}</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" className="text-(--psj-muted) transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Acceso() {
  return (
    <AuthFrame title="¿Cómo vas a ingresar?" subtitle="Elige tu perfil para continuar." back="/">
      <div className="flex flex-col gap-3">
        {ROLES.map((role) => (
          <RoleCard key={role.href} {...role} />
        ))}
      </div>
    </AuthFrame>
  );
}
