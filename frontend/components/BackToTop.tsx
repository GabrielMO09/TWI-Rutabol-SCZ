"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

// Las áreas con menú inferior o mapa a pantalla completa tienen su propio desplazamiento.
const HIDDEN_IN = ["/pasajero", "/chofer", "/control", "/mapa"];

/** Botón flotante que vuelve al inicio de la página; aparece al bajar. */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible || HIDDEN_IN.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return (
    <button
      type="button"
      aria-label="Volver al inicio de la página"
      title="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed left-[calc(env(safe-area-inset-left)+16px)] top-auto bottom-[calc(env(safe-area-inset-bottom)+20px)] z-[900] md:left-auto md:right-[calc(env(safe-area-inset-right)+24px)] md:bottom-[calc(env(safe-area-inset-bottom)+24px)] flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
