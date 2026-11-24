import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import ControlShell from "@/components/control/ControlShell";
import "../area.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export default function ControlLayout({ children }: { children: ReactNode }) {
  return (
    <div data-area="control" className={`${inter.variable} flex min-h-dvh flex-1 flex-col`}>
      <ControlShell>{children}</ControlShell>
    </div>
  );
}
