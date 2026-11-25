
"use client";

import { useRef, useState } from "react";

import {
  ArrowDownToLine,
  ArrowRight,
  Ban,
  BusFront,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  History,
  Link2,
  LoaderCircle,
  Lock,
  LockOpen,
  Plus,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  Wallet as WalletIcon,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  bs,
  dateTime,
  maskCard,
} from "@/components/pasajero/format";

import {
  EmptyState,
  ErrorState,
  Notice,
  Sheet,
  Skeleton,
  StatusPill,
} from "@/components/pasajero/ui";

import {
  act,
  newKey,
  useFetch,
} from "@/lib/api";

/* =========================================
   TIPOS DE DATOS
========================================= */

type MovType =
  | "recarga"
  | "pasaje"
  | "ajuste"
  | "devolucion";

interface Movement {
  id: string;
  at: number;
  type: MovType;
  amount: number;
  status: "confirmado" | "pendiente" | "rechazado";
  ref: string;
  balanceAfter: number;
}

interface Wallet {
  cardNumber: string;
  balance: number;
  status: "activa" | "bloqueada";
  physicalLinked?: string;
  movements: Movement[];
}

interface Recharge {
  id: string;
  at: number;
  amount: number;
  method: string;
  status: "pendiente" | "confirmada" | "fallida";
  note?: string;
}

/* =========================================
   CONFIGURACIÓN DE MOVIMIENTOS
========================================= */

const MOV: Record<
  MovType,
  {
    label: string;
    icon: LucideIcon;
    style: string;
  }
> = {
  recarga: {
    label: "Recarga de saldo",
    icon: ArrowDownToLine,
    style: "bg-emerald-50 text-emerald-700",
  },

  pasaje: {
    label: "Pago de pasaje",
    icon: BusFront,
    style: "bg-blue-50 text-blue-700",
  },

  ajuste: {
    label: "Ajuste de saldo",
    icon: SlidersHorizontal,
    style: "bg-violet-50 text-violet-700",
  },

  devolucion: {
    label: "Devolución",
    icon: Undo2,
    style: "bg-amber-50 text-amber-700",
  },
};

/* =========================================
   MÉTODOS DE RECARGA
========================================= */

const METHODS = [
  {
    id: "qr",
    label: "QR bancario",
    icon: QrCode,
    help: "Simulación de pago mediante QR bancario.",
  },
  {
    id: "transferencia",
    label: "Transferencia",
    icon: ArrowDownToLine,
    help: "Simulación de transferencia bancaria.",
  },
  {
    id: "tarjeta",
    label: "Tarjeta de débito",
    icon: CreditCard,
    help: "Simulación de pago con tarjeta.",
  },
] as const;

const QUICK = [5, 10, 20, 50];

const RECHARGE_PILL = {
  confirmada: {
    tone: "success",
    label: "Confirmada",
    icon: CheckCircle2,
  },

  fallida: {
    tone: "danger",
    label: "Fallida",
    icon: XCircle,
  },

  pendiente: {
    tone: "warn",
    label: "Pendiente",
    icon: Clock,
  },
} as const;

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const PRIMARY =
  "group flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition-all enabled:hover:bg-emerald-900 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const OUTLINE =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

const INPUT =
  "block min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100";

/* =========================================
   TARJETA VIRTUAL CREDICARD
========================================= */

function VirtualCard({
  wallet,
}: {
  wallet: Wallet;
}) {
  const [showBalance, setShowBalance] =
    useState(true);

  const blocked =
    wallet.status === "bloqueada";

  return (
    <section
      aria-label="Saldo y tarjeta virtual"
      className="animate-fade-up relative isolate flex min-h-[310px] min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-linear-to-br from-emerald-950 via-emerald-800 to-emerald-600 p-6 text-white shadow-xl sm:p-8"
    >

      {/* Decoraciones de la tarjeta */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full border border-white/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-white/5"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-linear-to-l from-white/5 to-transparent"
      />

      {/* Encabezado */}

      <div className="relative flex flex-wrap items-start justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <CreditCard
              size={24}
              aria-hidden="true"
              className="text-emerald-200"
            />

            <h2 className="text-2xl font-extrabold italic tracking-tight sm:text-3xl">
              Credicard
            </h2>

          </div>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-100/70">
            Billetera digital de transporte
          </p>

        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            blocked
              ? "border-red-300/30 bg-red-500/20 text-red-100"
              : "border-white/15 bg-white/10 text-emerald-100"
          }`}
        >

          {blocked ? (
            <Lock size={13} aria-hidden="true" />
          ) : (
            <CheckCircle2
              size={14}
              aria-hidden="true"
            />
          )}

          {blocked ? "Bloqueada" : "Activa"}

        </span>

      </div>

      {/* Saldo disponible */}

      <div className="relative my-7">

        <div className="mb-2 flex items-center gap-2">

          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/75">
            Saldo disponible
          </p>

          <button
            type="button"
            onClick={() =>
              setShowBalance((previous) => !previous)
            }
            aria-label={
              showBalance
                ? "Ocultar saldo"
                : "Mostrar saldo"
            }
            aria-pressed={!showBalance}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-100 transition-colors hover:bg-white/10"
          >

            {showBalance ? (
              <Eye size={17} aria-hidden="true" />
            ) : (
              <EyeOff size={17} aria-hidden="true" />
            )}

          </button>

        </div>

        <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">

          {showBalance
            ? bs(wallet.balance)
            : "Bs ••••••"}

        </p>

      </div>

      {/* Identificación de la tarjeta */}

      <div className="relative">

        <div className="mb-5 flex items-center justify-between">

          {/* Chip decorativo */}

          <svg
            viewBox="0 0 52 40"
            className="h-10 w-13"
            fill="none"
            aria-hidden="true"
          >

            <rect
              width="52"
              height="40"
              rx="8"
              fill="#D9C38C"
            />

            <path
              d="M0 13H17V0M0 27H17V40M35 0V13H52M35 40V27H52M17 13H35V27H17Z"
              stroke="#9C854B"
              strokeWidth="1.3"
            />

            <rect
              x="2"
              y="2"
              width="48"
              height="36"
              rx="6"
              stroke="white"
              strokeOpacity=".3"
            />

          </svg>

          <BusFront
            size={36}
            aria-hidden="true"
            className="text-emerald-100/50"
          />

        </div>

        <p
          aria-label={`Tarjeta terminada en ${wallet.cardNumber.slice(-4)}`}
          className="break-all font-mono text-base font-medium tracking-[0.14em] text-white sm:text-xl"
        >
          {maskCard(wallet.cardNumber)}
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">

          <div>

            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-200/70">
              Tarjeta virtual
            </p>

            <p className="mt-1 text-xs text-emerald-100">

              {wallet.physicalLinked
                ? `Física vinculada (…${wallet.physicalLinked.slice(-4)})`
                : "Sin tarjeta física vinculada"}

            </p>

          </div>

          <p className="text-xs font-extrabold tracking-wide">
            RUTABOL-SCZ
          </p>

        </div>

      </div>

    </section>
  );
}

/* =========================================
   TARJETA DE ESTADÍSTICAS
========================================= */

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  style,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  style: string;
}) {
  return (
    <div className={`${CARD} p-5`}>

      <span
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${style}`}
      >

        <Icon size={22} aria-hidden="true" />

      </span>

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* =========================================
   SELECTOR DE MONTOS RÁPIDOS
========================================= */

function QuickAmounts({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (amount: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

      {QUICK.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={disabled}
          aria-pressed={value === amount}
          onClick={() => onChange(amount)}
          className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-bold tabular-nums transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            value === amount
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100"
              : "border-slate-200 bg-white text-slate-600 enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50"
          }`}
        >
          Bs {amount}
        </button>
      ))}

    </div>
  );
}

/* =========================================
   MOVIMIENTO INDIVIDUAL
========================================= */

function MovementRow({
  movement,
}: {
  movement: Movement;
}) {
  const { label, icon: Icon, style } =
    MOV[movement.type];

  const negative = movement.amount < 0;

  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-6">

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style}`}
      >

        <Icon size={21} aria-hidden="true" />

      </span>

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <p className="text-sm font-bold text-slate-800">
            {label}
          </p>

          {movement.status === "pendiente" && (
            <StatusPill tone="warn">
              Pendiente
            </StatusPill>
          )}

          {movement.status === "rechazado" && (
            <StatusPill tone="danger">
              Rechazado
            </StatusPill>
          )}

        </div>

        <p className="mt-1 text-xs text-slate-500">
          {dateTime(movement.at)}
        </p>

        <p className="mt-1 break-all text-[10px] text-slate-400">
          Ref. {movement.ref}
        </p>

      </div>

      <div className="shrink-0 text-right">

        <p
          className={`text-sm font-extrabold tabular-nums sm:text-base ${
            negative
              ? "text-red-600"
              : "text-emerald-700"
          }`}
        >
          {negative ? "−" : "+"}
          {bs(Math.abs(movement.amount))}
        </p>

        <p className="mt-1 text-[10px] tabular-nums text-slate-500 sm:text-xs">
          Saldo {bs(movement.balanceAfter)}
        </p>

      </div>

    </li>
  );
}

/* =========================================
   RECARGA INDIVIDUAL
========================================= */

function RechargeRow({
  recharge,
}: {
  recharge: Recharge;
}) {
  const pill = RECHARGE_PILL[recharge.status];

  const method = METHODS.find(
    (item) => item.id === recharge.method
  );

  const Icon = method?.icon ?? WalletIcon;

  const StatusIcon = pill.icon;

  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6">

      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

        <Icon size={21} aria-hidden="true" />

      </span>

      <div className="min-w-0 flex-1">

        <p className="text-base font-extrabold tabular-nums text-slate-900">
          {bs(recharge.amount)}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {method?.label ?? recharge.method}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {dateTime(recharge.at)}
        </p>

        {recharge.note && (
          <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">
            {recharge.note}
          </p>
        )}

      </div>

      <StatusPill tone={pill.tone}>

        <StatusIcon
          size={13}
          aria-hidden="true"
        />

        {pill.label}

      </StatusPill>

    </li>
  );
}

/* =========================================
   PÁGINA PRINCIPAL DE CREDICARD
========================================= */

export default function Credicard() {
  const {
    data: wallet,
    loading,
    error,
    reload,
  } = useFetch<Wallet>("/wallet/me", 4000);

  const {
    data: recharges,
    loading: rechargesLoading,
    error: rechargesError,
    reload: reloadRecharges,
  } = useFetch<Recharge[]>(
    "/wallet/recharges",
    4000
  );

  /* Estados de la interfaz */

  const [tab, setTab] =
    useState<"mov" | "rec">("mov");

  const [sheet, setSheet] = useState<
    null | "recharge" | "manage"
  >(null);

  const [step, setStep] =
    useState<"form" | "summary">("form");

  const [amount, setAmount] = useState("20");

  const [method, setMethod] = useState<
    (typeof METHODS)[number]["id"]
  >("qr");

  const [physical, setPhysical] =
    useState("");

  const [confirmBlock, setConfirmBlock] =
    useState(false);

  const [msg, setMsg] =
    useState<string | null>(null);

  const [ok, setOk] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const lock = useRef(false);

  /*
   * Conserva la clave de idempotencia durante
   * los reintentos de una misma recarga.
   */

  const key = useRef(newKey());

  const attemptedRecharge = useRef<{
    amount: number;
    method: string;
  } | null>(null);

  const value = Number(
    amount.replace(",", ".")
  );

  const validAmount =
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 500;

  /* =====================================
     CONTROL DE VENTANAS
  ===================================== */

  function resetSheet() {
    setSheet(null);
    setStep("form");
    setConfirmBlock(false);
    setMsg(null);
  }

  function closeSheet() {
    if (lock.current) return;

    resetSheet();
  }

  function openRecharge() {
    if (
      !wallet ||
      wallet.status === "bloqueada" ||
      lock.current
    ) {
      return;
    }

    setMsg(null);
    setStep("form");
    setSheet("recharge");
  }

  function openManage() {
    if (lock.current) return;

    setMsg(null);
    setConfirmBlock(false);
    setSheet("manage");
  }

  /* =====================================
     RESUMEN DE RECARGA
  ===================================== */

  function toSummary() {
    if (!validAmount) {
      setMsg(
        "El monto debe estar entre Bs 1 y Bs 500."
      );

      return;
    }

    if (wallet?.status === "bloqueada") {
      setMsg(
        "Debes desbloquear tu tarjeta antes de recargar."
      );

      return;
    }

    setMsg(null);
    setStep("summary");
  }

  /* =====================================
     REALIZAR RECARGA
  ===================================== */

  async function recharge() {
    if (lock.current) return;

    if (!validAmount) {
      setMsg(
        "El monto debe estar entre Bs 1 y Bs 500."
      );

      return;
    }

    if (
      !wallet ||
      wallet.status === "bloqueada"
    ) {
      setMsg(
        "La tarjeta no está disponible para recargas."
      );

      return;
    }

    const previous = attemptedRecharge.current;

    /*
     * Si ya se intentó enviar una recarga,
     * solo se reintenta con los mismos datos.
     */

    if (
      previous &&
      (
        previous.amount !== value ||
        previous.method !== method
      )
    ) {
      setMsg(
        "Existe un intento anterior. Vuelve al monto y método originales para reintentarlo sin duplicar la solicitud."
      );

      return;
    }

    attemptedRecharge.current = {
      amount: value,
      method,
    };

    lock.current = true;

    setBusy(true);
    setMsg(null);
    setOk(null);

    try {
      const err = await act(
        "/wallet/recharge",
        "POST",
        {
          amount: value,
          method,
          idempotencyKey: key.current,
        }
      );

      if (err) {
        setMsg(err);

        return;
      }

      key.current = newKey();

      attemptedRecharge.current = null;

      resetSheet();

      setTab("rec");

      setOk(
        "Recarga solicitada correctamente. Está pendiente de confirmación del proveedor."
      );

      void reload();

      void reloadRecharges();

    } catch {
      setMsg(
        "No se pudo confirmar el envío. Revisa tu conexión y vuelve a intentar con los mismos datos."
      );

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     GESTIÓN DE LA TARJETA
  ===================================== */

  async function simple(
    path: string,
    body?: unknown,
    success?: string
  ): Promise<boolean> {
    if (lock.current) return false;

    lock.current = true;

    setBusy(true);
    setMsg(null);
    setOk(null);

    try {
      const err = await act(
        path,
        "POST",
        body
      );

      if (err) {
        setMsg(err);

        return false;
      }

      setOk(success ?? null);

      resetSheet();

      void reload();

      return true;

    } catch {
      setMsg(
        "No se pudo completar la operación. Verifica tu conexión."
      );

      return false;

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     ACTUALIZAR INFORMACIÓN
  ===================================== */

  function refresh() {
    void reload();

    void reloadRecharges();
  }

  /* =====================================
     ESTADO DE CARGA
  ===================================== */

  if (loading && !wallet) {
    return (
      <div
        aria-busy="true"
        aria-label="Cargando tu Credicard"
        className="space-y-5"
      >

        <Skeleton className="h-12 w-64 max-w-full rounded-xl" />

        <div className="grid gap-5 lg:grid-cols-2">

          <Skeleton className="h-80 w-full rounded-3xl" />

          <Skeleton className="h-80 w-full rounded-3xl" />

        </div>

        <div className="grid gap-4 sm:grid-cols-3">

          {[0, 1, 2].map((item) => (
            <Skeleton
              key={item}
              className="h-40 w-full rounded-2xl"
            />
          ))}

        </div>

        <Skeleton className="h-64 w-full rounded-2xl" />

      </div>
    );
  }

  if (!wallet) {
    return (
      <ErrorState
        message={
          error ??
          "No pudimos cargar tu Credicard."
        }
        onRetry={() => void reload()}
      />
    );
  }

  /* =====================================
     DATOS DE LA BILLETERA
  ===================================== */

  const blocked =
    wallet.status === "bloqueada";

  const method_ =
    METHODS.find(
      (item) => item.id === method
    )!;

  const confirmedRecharges =
    recharges
      ?.filter(
        (item) =>
          item.status === "confirmada"
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount),
        0
      ) ?? 0;

  const pendingRecharges =
    recharges?.filter(
      (item) =>
        item.status === "pendiente"
    ).length ?? 0;

  const paidFares = wallet.movements
    .filter(
      (item) =>
        item.type === "pasaje" &&
        item.status === "confirmado"
    )
    .reduce(
      (total, item) =>
        total + Math.abs(item.amount),
      0
    );

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1320px] flex-col gap-5 pb-4 sm:gap-6">

      {/* =================================
          ENCABEZADO
      ================================= */}

      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">

            <WalletIcon
              size={27}
              aria-hidden="true"
            />

          </span>

          <div className="min-w-0">

            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Servicios financieros
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Mi Credicard
            </h1>

            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Administra tu saldo y tus recargas.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || rechargesLoading}
          className={`${OUTLINE} min-h-10`}
        >

          <RefreshCw
            size={17}
            aria-hidden="true"
            className={
              loading || rechargesLoading
                ? "animate-spin"
                : ""
            }
          />

          Actualizar

        </button>

      </div>

      {/* =================================
          TARJETA Y RECARGA RÁPIDA
      ================================= */}

      <div className="grid min-w-0 items-stretch gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">

        <VirtualCard wallet={wallet} />

        {/* Panel de acciones */}

        <section className={`${CARD} animate-fade-up delay-100 flex flex-col p-5 sm:p-7`}>

          <div className="flex items-start gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

              <Plus
                size={25}
                aria-hidden="true"
              />

            </span>

            <div>

              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Recarga rápida
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Añade saldo a tu tarjeta virtual
                para tus próximos viajes.
              </p>

            </div>

          </div>

          <div className="my-5 border-y border-slate-100 py-5">

            <p className="mb-3 text-xs font-bold text-slate-600">
              Selecciona un monto
            </p>

            <QuickAmounts
              value={value}
              disabled={blocked || busy}
              onChange={(nextAmount) =>
                setAmount(String(nextAmount))
              }
            />

            <p className="mt-3 text-[11px] text-slate-500">
              Puedes ingresar otro monto entre
              Bs 1 y Bs 500.
            </p>

          </div>

          <div className="mt-auto space-y-3">

            <button
              type="button"
              disabled={blocked || busy}
              onClick={openRecharge}
              className={`${PRIMARY} w-full`}
            >

              <Plus
                size={19}
                aria-hidden="true"
              />

              Recargar saldo

              <ArrowRight
                size={18}
                aria-hidden="true"
                className="ml-auto transition-transform group-hover:translate-x-1"
              />

            </button>

            <button
              type="button"
              disabled={busy}
              onClick={openManage}
              className={`${OUTLINE} w-full`}
            >

              <Settings2
                size={19}
                aria-hidden="true"
              />

              Gestionar tarjeta

            </button>

          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">

            <ShieldCheck
              size={15}
              aria-hidden="true"
              className="shrink-0 text-emerald-600"
            />

            Sistema de recargas de demostración

          </div>

        </section>

      </div>

      {/* =================================
          NOTIFICACIONES
      ================================= */}

      {error && (
        <Notice tone="warn">
          No pudimos actualizar tu saldo.
          Mostramos el último dato recibido.
        </Notice>
      )}

      {blocked && (
        <Notice tone="warn">
          Tu tarjeta está bloqueada: no puedes
          pagar ni recargar hasta desbloquearla.
        </Notice>
      )}

      {ok && (
        <div role="status">
          <Notice>{ok}</Notice>
        </div>
      )}

      {/* =================================
          RESUMEN DE ACTIVIDAD
      ================================= */}

      <div className="animate-fade-up delay-200 grid gap-4 sm:grid-cols-3">

        <StatCard
          icon={ArrowDownToLine}
          label="Recargas confirmadas"
          value={
            !recharges || rechargesError
              ? "—"
              : bs(confirmedRecharges)
          }
          description="Importe de las recargas recibidas."
          style="bg-emerald-50 text-emerald-700"
        />

        <StatCard
          icon={BusFront}
          label="Pagos de pasajes"
          value={bs(paidFares)}
          description="Total de pagos confirmados en los movimientos disponibles."
          style="bg-blue-50 text-blue-700"
        />

        <StatCard
          icon={Clock}
          label="Recargas pendientes"
          value={
            !recharges || rechargesError
              ? "—"
              : String(pendingRecharges)
          }
          description="Solicitudes pendientes de confirmación."
          style="bg-amber-50 text-amber-700"
        />

      </div>

      {/* =================================
          ACTIVIDAD DE LA TARJETA
      ================================= */}

      <section
        aria-label="Actividad de la tarjeta"
        className={`${CARD} animate-fade-up delay-300 overflow-hidden`}
      >

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">

          <div className="flex items-center gap-3">

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

              <History
                size={23}
                aria-hidden="true"
              />

            </span>

            <div>

              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Actividad de la tarjeta
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Consulta tus operaciones y recargas.
              </p>

            </div>

          </div>

        </div>

        {/* Pestañas de navegación */}

        <div className="border-b border-slate-100 px-4 py-3 sm:px-6">

          <div
            role="tablist"
            aria-label="Actividad de la tarjeta"
            className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
          >

            {(
              [
                ["mov", "Movimientos"],
                ["rec", "Recargas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all sm:text-sm ${
                  tab === id
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >

                {id === "mov" ? (
                  <History
                    size={17}
                    aria-hidden="true"
                  />
                ) : (
                  <WalletIcon
                    size={17}
                    aria-hidden="true"
                  />
                )}

                {label}

              </button>
            ))}

          </div>

        </div>

        {/* Listado de movimientos */}

        {tab === "mov" ? (
          <div
            role="tabpanel"
            id="panel-mov"
            aria-labelledby="tab-mov"
          >

            {wallet.movements.length === 0 ? (
              <div className="p-6">

                <EmptyState
                  icon={WalletIcon}
                  title="Todavía no tienes movimientos"
                >
                  Recarga saldo para empezar a pagar
                  tus pasajes.
                </EmptyState>

              </div>
            ) : (
              <>

                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:px-6">

                  <span>Detalle de la operación</span>

                  <span>Monto</span>

                </div>

                <ul className="divide-y divide-slate-100">

                  {wallet.movements.map(
                    (movement) => (
                      <MovementRow
                        key={movement.id}
                        movement={movement}
                      />
                    )
                  )}

                </ul>

              </>
            )}

          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-rec"
            aria-labelledby="tab-rec"
          >

            {rechargesLoading && !recharges ? (
              <div className="space-y-3 p-5">

                {[0, 1, 2].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-16 w-full rounded-xl"
                  />
                ))}

              </div>
            ) : rechargesError && !recharges ? (
              <div className="p-5">

                <ErrorState
                  message="No pudimos consultar tus recargas."
                  onRetry={() =>
                    void reloadRecharges()
                  }
                />

              </div>
            ) : !recharges?.length ? (
              <div className="p-6">

                <EmptyState
                  icon={Clock}
                  title="Aún no solicitaste recargas"
                >
                  Cuando recargues, podrás consultar
                  aquí el estado de cada solicitud.
                </EmptyState>

              </div>
            ) : (
              <>

                {rechargesError && (
                  <div className="p-4">

                    <Notice tone="warn">
                      Mostramos las últimas recargas
                      recibidas.
                    </Notice>

                  </div>
                )}

                <ul className="divide-y divide-slate-100">

                  {recharges.map(
                    (recharge) => (
                      <RechargeRow
                        key={recharge.id}
                        recharge={recharge}
                      />
                    )
                  )}

                </ul>

              </>
            )}

          </div>
        )}

      </section>

      {/* =================================
          INFORMACIÓN DE SEGURIDAD
      ================================= */}

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">

        <ShieldCheck
          size={23}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-emerald-700"
        />

        <div>

          <p className="text-sm font-bold text-emerald-900">
            Gestiona tu Credicard
          </p>

          <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
            Puedes bloquear tu tarjeta virtual
            cuando lo necesites y desbloquearla
            desde las opciones de gestión.
          </p>

        </div>

      </div>

      {/* =================================
          VENTANA DE RECARGA
      ================================= */}

      <Sheet
        open={sheet === "recharge"}
        onClose={closeSheet}
        title={
          step === "form"
            ? "Recargar saldo"
            : "Confirma tu recarga"
        }
      >

        {step === "form" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              toSummary();
            }}
          >

            {/* Indicador de pasos */}

            <div className="grid grid-cols-2 gap-2">

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-xs font-bold text-emerald-700">
                01. Configuración
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-3 text-center text-xs font-medium text-slate-500">
                02. Confirmación
              </div>

            </div>

            {/* Montos rápidos */}

            <div>

              <p className="mb-3 text-sm font-bold text-slate-800">
                ¿Cuánto deseas recargar?
              </p>

              <QuickAmounts
                value={value}
                disabled={busy}
                onChange={(nextAmount) =>
                  setAmount(String(nextAmount))
                }
              />

            </div>

            {/* Monto personalizado */}

            <div>

              <label
                htmlFor="amt"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Otro monto
              </label>

              <div className="relative">

                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-emerald-700">
                  Bs
                </span>

                <input
                  id="amt"
                  value={amount}
                  inputMode="decimal"
                  required
                  disabled={busy}
                  aria-invalid={!validAmount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  className={`${INPUT} pl-12 ${
                    !validAmount
                      ? "border-red-300"
                      : ""
                  }`}
                />

              </div>

              <p
                className={`mt-2 text-xs ${
                  validAmount
                    ? "text-slate-500"
                    : "text-red-600"
                }`}
              >
                El monto debe estar entre Bs 1 y Bs 500.
              </p>

            </div>

            {/* Métodos de pago */}

            <fieldset disabled={busy}>

              <legend className="mb-3 text-sm font-bold text-slate-800">
                Medio de pago
              </legend>

              <div className="space-y-3">

                {METHODS.map((item) => {
                  const Icon = item.icon;

                  const active =
                    method === item.id;

                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                        active
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >

                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-white text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >

                        <Icon
                          size={22}
                          aria-hidden="true"
                        />

                      </span>

                      <span className="min-w-0 flex-1">

                        <span className="block text-sm font-bold text-slate-800">
                          {item.label}
                        </span>

                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                          {item.help}
                        </span>

                      </span>

                      <input
                        type="radio"
                        name="method"
                        checked={active}
                        onChange={() =>
                          setMethod(item.id)
                        }
                        className="h-4 w-4 shrink-0 accent-emerald-600"
                      />

                    </label>
                  );
                })}

              </div>

            </fieldset>

            <Notice tone="warn">
              Los medios de pago funcionan en modo
              de demostración. No se realizará ningún
              cobro real.
            </Notice>

            {msg && (
              <ErrorState message={msg} />
            )}

            <button
              type="submit"
              disabled={
                !validAmount ||
                blocked ||
                busy
              }
              className={`${PRIMARY} w-full`}
            >

              Continuar

              <ArrowRight
                size={18}
                aria-hidden="true"
              />

            </button>

          </form>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Indicador de pasos */}

            <div className="grid grid-cols-2 gap-2">

              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700">

                <CheckCircle2
                  size={15}
                  aria-hidden="true"
                />

                Configuración

              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-xs font-bold text-emerald-700">
                02. Confirmación
              </div>

            </div>

            {/* Monto destacado */}

            <div className="rounded-[24px] bg-linear-to-br from-emerald-900 to-emerald-700 p-6 text-center text-white">

              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">

                <WalletIcon
                  size={25}
                  aria-hidden="true"
                />

              </span>

              <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">
                Monto a recargar
              </p>

              <p className="mt-3 text-4xl font-extrabold tabular-nums">
                {bs(value)}
              </p>

            </div>

            {/* Resumen de operación */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">

              <h3 className="mb-4 text-sm font-bold text-slate-800">
                Resumen de la operación
              </h3>

              <dl className="space-y-4 text-sm">

                <div className="flex items-center justify-between gap-3">

                  <dt className="text-slate-500">
                    Monto
                  </dt>

                  <dd className="font-bold tabular-nums text-slate-900">
                    {bs(value)}
                  </dd>

                </div>

                <div className="flex items-center justify-between gap-3">

                  <dt className="text-slate-500">
                    Medio de pago
                  </dt>

                  <dd className="text-right font-semibold text-slate-800">
                    {method_.label}
                  </dd>

                </div>

                <div className="flex items-center justify-between gap-3">

                  <dt className="text-slate-500">
                    Saldo actual
                  </dt>

                  <dd className="tabular-nums text-slate-700">
                    {bs(wallet.balance)}
                  </dd>

                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">

                  <dt className="text-xs font-semibold text-emerald-800">
                    Saldo estimado al confirmarse
                  </dt>

                  <dd className="text-lg font-extrabold tabular-nums text-emerald-700">
                    {bs(wallet.balance + value)}
                  </dd>

                </div>

              </dl>

            </div>

            <Notice tone="warn">
              Pago simulado: no se mueve dinero real.
              El proveedor de prueba puede confirmar
              la recarga después de procesarla.
            </Notice>

            {msg && (
              <ErrorState message={msg} />
            )}

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMsg(null);
                  setStep("form");
                }}
                className={OUTLINE}
              >
                Volver
              </button>

              <button
                type="button"
                disabled={busy || blocked}
                onClick={() => void recharge()}
                className={PRIMARY}
              >

                {busy ? (
                  <>

                    <LoaderCircle
                      size={18}
                      aria-hidden="true"
                      className="animate-spin"
                    />

                    Enviando...

                  </>
                ) : (
                  <>

                    <CheckCircle2
                      size={18}
                      aria-hidden="true"
                    />

                    Confirmar

                  </>
                )}

              </button>

            </div>

            <p className="text-center text-[11px] leading-relaxed text-slate-500">
              Si la conexión se interrumpe,
              reintenta con el mismo monto y
              método de pago.
            </p>

          </div>
        )}

      </Sheet>

      {/* =================================
          GESTIÓN DE TARJETA
      ================================= */}

      <Sheet
        open={sheet === "manage"}
        onClose={closeSheet}
        title="Gestionar tarjeta"
      >

        <div className="flex flex-col gap-5">

          {msg && (
            <ErrorState message={msg} />
          )}

          {/* Estado actual */}

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                blocked
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >

              {blocked ? (
                <Lock size={23} aria-hidden="true" />
              ) : (
                <ShieldCheck
                  size={23}
                  aria-hidden="true"
                />
              )}

            </span>

            <div className="min-w-0 flex-1">

              <p className="text-sm font-bold text-slate-800">
                Estado de Credicard
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {blocked
                  ? "Tu tarjeta está bloqueada."
                  : "Tu tarjeta está disponible."}
              </p>

            </div>

            <StatusPill
              tone={
                blocked
                  ? "danger"
                  : "success"
              }
            >
              {blocked
                ? "Bloqueada"
                : "Activa"}
            </StatusPill>

          </div>

          {/* Bloqueo y desbloqueo */}

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">

            <h3 className="text-sm font-bold text-slate-800">
              Seguridad de la tarjeta
            </h3>

            <p className="text-xs leading-relaxed text-slate-500">
              Administra la disponibilidad de tu
              tarjeta para realizar operaciones.
            </p>

            {blocked ? (
              <button
                type="button"
                disabled={busy}
                className={`${PRIMARY} w-full`}
                onClick={() =>
                  void simple(
                    "/wallet/unblock",
                    undefined,
                    "Tarjeta desbloqueada."
                  )
                }
              >

                {busy ? (
                  <LoaderCircle
                    size={18}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : (
                  <LockOpen
                    size={18}
                    aria-hidden="true"
                  />
                )}

                Desbloquear tarjeta

              </button>
            ) : confirmBlock ? (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">

                <p className="text-sm font-bold text-red-800">
                  ¿Bloquear tu Credicard?
                </p>

                <p className="text-xs leading-relaxed text-red-700">
                  No podrás realizar pagos ni
                  recargas hasta desbloquearla.
                </p>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirmBlock(false)
                    }
                    className={OUTLINE}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void simple(
                        "/wallet/block",
                        undefined,
                        "Tarjeta bloqueada."
                      )
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white enabled:hover:bg-red-700 disabled:opacity-50"
                  >

                    {busy && (
                      <LoaderCircle
                        size={16}
                        aria-hidden="true"
                        className="animate-spin"
                      />
                    )}

                    Sí, bloquear

                  </button>

                </div>

              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmBlock(true)
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition-colors enabled:hover:bg-red-50 disabled:opacity-50"
              >

                <Ban
                  size={18}
                  aria-hidden="true"
                />

                Bloquear tarjeta

              </button>
            )}

          </section>

          {/* Vincular tarjeta física */}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">

            <div className="flex items-center gap-3">

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                <CreditCard
                  size={23}
                  aria-hidden="true"
                />

              </span>

              <div>

                <h3 className="text-sm font-bold text-slate-800">
                  Tarjeta física
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Vinculación opcional
                </p>

              </div>

            </div>

            {wallet.physicalLinked && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">

                <CheckCircle2
                  size={17}
                  aria-hidden="true"
                />

                Tarjeta vinculada: ••••{" "}
                {wallet.physicalLinked.slice(-4)}

              </div>
            )}

            <div>

              <label
                htmlFor="phys"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Número de tarjeta física
              </label>

              <input
                id="phys"
                type="text"
                inputMode="numeric"
                maxLength={16}
                placeholder="Ingresa los 16 dígitos"
                value={physical}
                disabled={busy}
                onChange={(event) =>
                  setPhysical(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                className={INPUT}
              />

              <div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-500">

                <span>
                  Credicard física RUTABOL-SCZ
                </span>

                <span className="tabular-nums">
                  {physical.length}/16
                </span>

              </div>

            </div>

            <button
              type="button"
              disabled={
                physical.length !== 16 ||
                busy
              }
              onClick={async () => {
                const success = await simple(
                  "/wallet/link-physical",
                  {
                    cardNumber: physical,
                  },
                  "Tarjeta física vinculada."
                );

                if (success) {
                  setPhysical("");
                }
              }}
              className={`${PRIMARY} w-full`}
            >

              {busy ? (
                <LoaderCircle
                  size={18}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Link2
                  size={18}
                  aria-hidden="true"
                />
              )}

              Vincular tarjeta física

            </button>

          </section>

        </div>

      </Sheet>

    </div>
  );
}
