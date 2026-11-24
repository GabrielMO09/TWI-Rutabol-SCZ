import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import PasajeroShell from "@/components/pasajero/PasajeroShell";
import "../area.css";

// Inter solo para el área del pasajero; conductor y Control siguen con Geist.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export default function PasajeroLayout({ children }: { children: ReactNode }) {
  return (
    <div data-area="pasajero" className={`${inter.variable} flex min-h-dvh flex-1 flex-col`}>
      <PasajeroShell>{children}</PasajeroShell>
    </div>
  );
}
