"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn, type LucideIcon } from "lucide-react";

/** Campo de contraseña con botón para mostrar u ocultar; conserva autocompletado y gestores de contraseñas. */
export function PasswordInput({ label = "Contraseña", error, desktopToggle = false, ...props }: Omit<ComponentProps<"input">, "type"> & { label?: string; error?: string | null; /** Muestra el botón de ver/ocultar solo desde 1024 px. */ desktopToggle?: boolean }) {
  const [show, setShow] = useState(false);
  const auto = useId();
  const id = props.id ?? auto;
  const toggle = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={show}
      className={`psj-icon-btn h-full ${desktopToggle ? "" : "absolute right-0 top-0"}`}
    >
      {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
  return (
    <div>
      <label htmlFor={id} className="psj-label">{label}</label>
      <div className="relative">
        <input {...props} id={id} type={show ? "text" : "password"} className={`psj-input ${desktopToggle ? "lg:pr-12!" : "pr-12"}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
        {desktopToggle ? <span className="absolute right-0 top-0 hidden h-full lg:block">{toggle}</span> : toggle}
      </div>
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-(--psj-danger)">{error}</p>}
    </div>
  );
}

/** Campo de texto con etiqueta visible y mensaje de validación debajo. */
export function TextField({ label, hint, error, ...props }: ComponentProps<"input"> & { label: string; hint?: string; error?: string | null }) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <div>
      <label htmlFor={id} className="psj-label">{label}</label>
      <input {...props} id={id} className="psj-input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-(--psj-muted-strong)">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-(--psj-danger)">{error}</p>}
    </div>
  );
}

/** Botón principal de envío: ancho completo, indicador de carga y bloqueado mientras se autentica. */
export function SubmitButton({ busy, children = "Ingresar", busyText = "Verificando...", icon: Icon = LogIn }: { busy: boolean; children?: string; busyText?: string; icon?: LucideIcon }) {
  return (
    <button type="submit" className="psj-btn psj-btn-primary psj-btn-lg w-full" disabled={busy} aria-busy={busy}>
      {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
      {busy ? busyText : children}
    </button>
  );
}
