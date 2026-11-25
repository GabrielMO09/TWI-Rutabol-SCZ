
"use client";

import {
  useId,
  useState,
  type ComponentProps,
} from "react";

import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Hash,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  Phone,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/* =========================================
   IDENTIDAD VISUAL DE LOS FORMULARIOS
========================================= */

type FieldTone = "emerald" | "blue" | "violet";

const TONES = {
  emerald: {
    icon: "text-emerald-600",

    focus:
      "focus:border-emerald-500 focus:ring-emerald-500/10",

    hover: "hover:border-emerald-300",

    toggle:
      "hover:bg-emerald-50 hover:text-emerald-700",

    button:
      "from-emerald-700 to-emerald-800 enabled:hover:from-emerald-800 enabled:hover:to-emerald-950",
  },

  blue: {
    icon: "text-blue-600",

    focus:
      "focus:border-blue-500 focus:ring-blue-500/10",

    hover: "hover:border-blue-300",

    toggle:
      "hover:bg-blue-50 hover:text-blue-700",

    button:
      "from-blue-700 to-blue-800 enabled:hover:from-blue-800 enabled:hover:to-blue-950",
  },

  violet: {
    icon: "text-violet-600",

    focus:
      "focus:border-violet-500 focus:ring-violet-500/10",

    hover: "hover:border-violet-300",

    toggle:
      "hover:bg-violet-50 hover:text-violet-700",

    button:
      "from-violet-700 to-violet-800 enabled:hover:from-violet-800 enabled:hover:to-violet-950",
  },
};

/* =========================================
   ESTILOS BASE
========================================= */

const INPUT_BASE =
  "block min-h-[52px] w-full min-w-0 rounded-xl border bg-white py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all duration-200 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const LABEL_BASE =
  "mb-2 block text-sm font-semibold text-slate-700";

const ERROR_STYLE =
  "border-red-300 focus:border-red-500 focus:ring-red-500/10";

const NORMAL_STYLE =
  "border-slate-200";

/* =========================================
   IDENTIFICAR ICONO DEL CAMPO
========================================= */

function resolveIcon(
  label: string,
  type?: string,
  inputMode?: string
): LucideIcon {
  const normalized = label.toLowerCase();

  if (
    type === "email" ||
    normalized.includes("correo") ||
    normalized.includes("email")
  ) {
    return Mail;
  }

  if (
    type === "tel" ||
    normalized.includes("teléfono") ||
    normalized.includes("celular")
  ) {
    return Phone;
  }

  if (
    inputMode === "numeric" ||
    normalized.includes("número") ||
    normalized.includes("código") ||
    normalized.includes("rude") ||
    normalized === "ci"
  ) {
    return Hash;
  }

  return UserRound;
}

/* =========================================
   MENSAJE DE VALIDACIÓN
========================================= */

function FieldError({
  id,
  error,
}: {
  id: string;
  error?: string | null;
}) {
  if (!error) return null;

  return (
    <p
      id={id}
      role="alert"
      className="animate-fade-in mt-2 flex items-start gap-2 text-xs font-medium leading-relaxed text-red-700"
    >
      <CircleAlert
        size={15}
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />

      <span>{error}</span>
    </p>
  );
}

/* =========================================
   MENSAJE DE AYUDA
========================================= */

function FieldHint({
  id,
  hint,
}: {
  id: string;
  hint?: string;
}) {
  if (!hint) return null;

  return (
    <p
      id={id}
      className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500"
    >
      <Info
        size={14}
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />

      <span>{hint}</span>
    </p>
  );
}

/* =========================================
   PROPIEDADES DEL CAMPO DE TEXTO
========================================= */

type TextFieldProps = ComponentProps<"input"> & {
  label: string;

  hint?: string;

  error?: string | null;

  icon?: LucideIcon;

  tone?: FieldTone;

  showIcon?: boolean;
};

/* =========================================
   CAMPO DE TEXTO
========================================= */

export function TextField({
  label,
  hint,
  error,
  icon,
  tone = "emerald",
  showIcon = true,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TextFieldProps) {
  const auto = useId();

  const id = props.id ?? auto;

  const theme = TONES[tone];

  const Icon =
    icon ??
    resolveIcon(
      label,
      props.type,
      props.inputMode
    );

  const description = [
    describedBy,
    error
      ? `${id}-err`
      : hint
        ? `${id}-hint`
        : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="w-full min-w-0">

      {/* Etiqueta */}

      <label
        htmlFor={id}
        className={LABEL_BASE}
      >
        {label}

        {props.required && (
          <span
            aria-hidden="true"
            className="ml-1 text-red-500"
          >
            *
          </span>
        )}
      </label>

      {/* Contenedor del campo */}

      <div className="relative">

        {/* Icono */}

        {showIcon && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center ${
              error
                ? "text-red-500"
                : theme.icon
            }`}
          >
            <Icon size={19} />
          </span>
        )}

        {/* Entrada de texto */}

        <input
          {...props}
          id={id}
          className={`${INPUT_BASE} ${
            showIcon
              ? "pl-12 pr-4"
              : "px-4"
          } ${
            error
              ? ERROR_STYLE
              : `${NORMAL_STYLE} ${theme.focus} ${theme.hover}`
          } ${className ?? ""}`}
          aria-invalid={error ? true : invalid}
          aria-describedby={description}
        />
      </div>

      {/* Mensaje de ayuda o validación */}

      {error ? (
        <FieldError
          id={`${id}-err`}
          error={error}
        />
      ) : (
        <FieldHint
          id={`${id}-hint`}
          hint={hint}
        />
      )}

    </div>
  );
}

/* =========================================
   PROPIEDADES DEL CAMPO DE CONTRASEÑA
========================================= */

type PasswordInputProps = Omit<
  ComponentProps<"input">,
  "type"
> & {
  label?: string;

  hint?: string;

  error?: string | null;

  desktopToggle?: boolean;

  tone?: FieldTone;

  showIcon?: boolean;
};

/* =========================================
   CAMPO DE CONTRASEÑA
========================================= */

export function PasswordInput({
  label = "Contraseña",
  hint,
  error,
  desktopToggle = false,
  tone = "emerald",
  showIcon = true,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const auto = useId();

  const id = props.id ?? auto;

  const theme = TONES[tone];

  const description = [
    describedBy,
    error
      ? `${id}-err`
      : hint
        ? `${id}-hint`
        : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="w-full min-w-0">

      {/* Etiqueta */}

      <label
        htmlFor={id}
        className={LABEL_BASE}
      >
        {label}

        {props.required && (
          <span
            aria-hidden="true"
            className="ml-1 text-red-500"
          >
            *
          </span>
        )}
      </label>

      {/* Contenedor de contraseña */}

      <div className="relative">

        {/* Icono de seguridad */}

        {showIcon && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center ${
              error
                ? "text-red-500"
                : theme.icon
            }`}
          >
            <LockKeyhole size={19} />
          </span>
        )}

        {/* Campo de contraseña */}

        <input
          {...props}
          id={id}
          type={show ? "text" : "password"}
          className={`${INPUT_BASE} ${
            showIcon
              ? "pl-12"
              : "pl-4"
          } ${
            desktopToggle
              ? "pr-4 lg:pr-14"
              : "pr-14"
          } ${
            error
              ? ERROR_STYLE
              : `${NORMAL_STYLE} ${theme.focus} ${theme.hover}`
          } ${className ?? ""}`}
          aria-invalid={error ? true : invalid}
          aria-describedby={description}
        />

        {/* Mostrar u ocultar contraseña */}

        <div
          className={`absolute inset-y-0 right-1.5 items-center ${
            desktopToggle
              ? "hidden lg:flex"
              : "flex"
          }`}
        >
          <button
            type="button"
            disabled={props.disabled}
            onClick={() =>
              setShow((previous) => !previous)
            }
            aria-label={
              show
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
            aria-pressed={show}
            aria-controls={id}
            title={
              show
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${theme.toggle}`}
          >
            {show ? (
              <EyeOff
                size={20}
                aria-hidden="true"
              />
            ) : (
              <Eye
                size={20}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

      </div>

      {/* Mensaje de validación o ayuda */}

      {error ? (
        <FieldError
          id={`${id}-err`}
          error={error}
        />
      ) : (
        <FieldHint
          id={`${id}-hint`}
          hint={hint}
        />
      )}

    </div>
  );
}

/* =========================================
   PROPIEDADES DEL BOTÓN PRINCIPAL
========================================= */

type SubmitButtonProps = {
  busy: boolean;

  children?: string;

  busyText?: string;

  icon?: LucideIcon;

  tone?: FieldTone;

  disabled?: boolean;

  className?: string;

  showArrow?: boolean;
};

/* =========================================
   BOTÓN DE ENVÍO DE FORMULARIOS
========================================= */

export function SubmitButton({
  busy,

  children = "Ingresar",

  busyText = "Verificando...",

  icon: Icon = LogIn,

  tone = "emerald",

  disabled = false,

  className,

  showArrow = true,
}: SubmitButtonProps) {
  const theme = TONES[tone];

  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy}
      className={`group relative isolate flex min-h-[54px] w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-linear-to-r px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${theme.button} ${className ?? ""}`}
    >

      {/* Efecto de iluminación */}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-white/10 opacity-0 transition-opacity duration-300 group-enabled:group-hover:opacity-100"
      />

      {/* Icono de carga o ingreso */}

      {busy ? (
        <LoaderCircle
          size={21}
          aria-hidden="true"
          className="shrink-0 animate-spin"
        />
      ) : (
        <Icon
          size={19}
          aria-hidden="true"
          className="shrink-0"
        />
      )}

      {/* Texto del botón */}

      <span aria-live="polite">
        {busy ? busyText : children}
      </span>

      {/* Flecha animada */}

      {!busy && showArrow && (
        <ArrowRight
          size={18}
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200 group-enabled:group-hover:translate-x-1"
        />
      )}

    </button>
  );
}
