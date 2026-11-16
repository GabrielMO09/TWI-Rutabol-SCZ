import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./AppShell";

export default function AuthFrame({
  title,
  subtitle,
  back = "/acceso",
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <Link href={back} className="flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline">
          <ArrowLeft size={16} />
          Volver
        </Link>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 pb-16 pt-6 ${wide ? "max-w-xl" : "max-w-md"}`}>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>}
        {!subtitle && <div className="mb-6" />}
        {children}
      </main>
    </div>
  );
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
      {text}
    </p>
  );
}
