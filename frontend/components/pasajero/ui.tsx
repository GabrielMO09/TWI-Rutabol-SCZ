"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RefreshCw, WifiOff, X, type LucideIcon } from "lucide-react";

/** Modal centrado en escritorio y hoja inferior en teléfono. Cierra con Escape o tocando fuera. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab" || !box.current) return;
      const items = box.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="psj-print-root fixed inset-0 z-[1300] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        className="psj-backdrop absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="psj-modal relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-(--psj-surface) pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-(--psj-line) px-4 py-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="psj-icon-btn psj-no-print" aria-label="Cerrar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

const TONE = {
  success: "psj-pill-success",
  warn: "psj-pill-warn",
  danger: "psj-pill-danger",
  neutral: "psj-pill-neutral",
} as const;
export type Tone = keyof typeof TONE;

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`psj-pill ${TONE[tone]}`}>{children}</span>;
}

/** Mensaje de confirmación o aviso discreto (se anuncia a lectores de pantalla). */
export function Notice({ tone = "success", children }: { tone?: "success" | "warn"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${tone === "success" ? "bg-(--psj-green-soft) text-(--psj-green-dark)" : "bg-(--psj-warn-soft) text-[#92400e]"}`}
    >
      {children}
    </p>
  );
}

/** Insignia cuadrada con el número de línea. */
export function LineBadge({ line }: { line: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--psj-green) text-sm font-bold text-white">
      {line}
    </span>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`psj-skeleton ${className}`} />;
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--psj-green-soft) text-(--psj-green)">
        <Icon size={24} aria-hidden="true" />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-(--psj-muted-strong)">{children}</div>}
    </div>
  );
}

/** Error legible para el usuario, con reintento cuando es seguro repetir la consulta. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-(--psj-danger-soft) p-3 text-sm text-[#991b1b]">
      <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 inline-flex min-h-11 items-center gap-1 font-semibold underline">
            <RefreshCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
