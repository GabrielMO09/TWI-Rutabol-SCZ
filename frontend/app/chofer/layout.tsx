import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import ChoferShell from "@/components/chofer/ChoferShell";
import "../area.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export default function ChoferLayout({ children }: { children: ReactNode }) {
  return (
    <div data-area="chofer" className={`${inter.variable} flex min-h-dvh flex-1 flex-col`}>
      <ChoferShell>{children}</ChoferShell>
    </div>
  );
}
