
"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BusFront,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  GraduationCap,
  History,
  MapPin,
  MessageSquareWarning,
  Printer,
  ReceiptText,
  Repeat,
  Search,
  SearchX,
  SlidersHorizontal,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  bs,
  dayLabel,
  time,
} from "@/components/pasajero/format";

import {
  EmptyState,
  LineBadge,
  Sheet,
  StatusPill,
  type Tone,
} from "@/components/pasajero/ui";

import {
  CATEGORY_LABEL,
  FARES,
} from "@/lib/data";

import {
  useApp,
  type Ticket,
} from "@/lib/store";

/* =========================================
   ESTADOS DE LOS VIAJES
========================================= */

const STATUS: Record<
  Ticket["status"],
  {
    label: string;
    tone: Tone;
  }
> = {
  pagado: {
    label: "Pagado",
    tone: "neutral",
  },

  abordado: {
    label: "Abordado",
    tone: "success",
  },

  rechazado: {
    label: "Rechazado",
    tone: "danger",
  },

  "pase-temporal": {
    label: "Trasbordo",
    tone: "warn",
  },
};

const STATUS_LONG: Record<
  Ticket["status"],
  string
> = {
  pagado: "Pagado, pendiente de abordar",

  abordado: "Abordado",

  rechazado: "Rechazado por el chofer",

  "pase-temporal":
    "Trasbordo con pase temporal",
};

/* =========================================
   ESTILOS COMPARTIDOS
========================================= */

const CARD =
  "min-w-0 rounded-[24px] border border-slate-200 bg-white shadow-sm";

const INPUT =
  "block min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const LABEL =
  "mb-2 block text-xs font-semibold text-slate-600";

const PRIMARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-900 active:scale-[0.99]";

const OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800";

/* =========================================
   FUNCIONES AUXILIARES
========================================= */

const lineOf = (ticket: Ticket) =>
  ticket.line ??
  ticket.busId.split("-")[0];

const internalOf = (ticket: Ticket) =>
  ticket.internal ??
  ticket.busId.split("-")[1];

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
    <div className={`${CARD} p-4 sm:p-5`}>

      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${style}`}
      >
        <Icon
          size={24}
          aria-hidden="true"
        />
      </span>

      <dt className="text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </dt>

      <dd className="mt-2 break-words text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
        {value}
      </dd>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================
   ESTADO DEL VIAJE
========================================= */

function TicketStatus({
  status,
}: {
  status: Ticket["status"];
}) {
  const info = STATUS[status];

  return (
    <StatusPill tone={info.tone}>
      {info.label}
    </StatusPill>
  );
}

/* =========================================
   TARJETA DE VIAJE PARA CELULARES
========================================= */

function MobileTicket({
  ticket,
  onSelect,
}: {
  ticket: Ticket;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Ver detalle: línea ${lineOf(ticket)}, interno ${internalOf(ticket)}, ${bs(ticket.fare)}`}
        className="group flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-50/60"
      >

        {/* Identificación de la línea */}

        <span className="flex shrink-0 items-center justify-center">

          <LineBadge
            line={lineOf(ticket)}
          />

        </span>

        {/* Información del viaje */}

        <span className="min-w-0 flex-1">

          <span className="block text-sm font-bold text-slate-900">
            Línea {lineOf(ticket)}
          </span>

          <span className="mt-1 block text-xs text-slate-500">
            Interno {internalOf(ticket)}
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">

            <Clock
              size={12}
              aria-hidden="true"
            />

            {time(ticket.at)}

            <span>·</span>

            {CATEGORY_LABEL[ticket.category]}

          </span>

        </span>

        {/* Importe y estado */}

        <span className="flex shrink-0 flex-col items-end gap-2">

          <span className="text-sm font-extrabold tabular-nums text-slate-900">
            {bs(ticket.fare)}
          </span>

          <TicketStatus
            status={ticket.status}
          />

        </span>

        <ChevronRight
          size={17}
          aria-hidden="true"
          className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700"
        />

      </button>
    </li>
  );
}

/* =========================================
   COMPROBANTE DEL VIAJE
========================================= */

function TicketReceipt({
  ticket,
}: {
  ticket: Ticket;
}) {
  const details = [
    {
      label: "Comprobante",
      value: ticket.receiptNo ?? ticket.id,
    },
    {
      label: "Categoría",
      value: CATEGORY_LABEL[ticket.category],
    },
    {
      label: "Medio de pago",
      value: ticket.method,
    },
    {
      label: "Estado",
      value: STATUS_LONG[ticket.status],
    },
  ];

  const claimQuery = new URLSearchParams({
    line: String(lineOf(ticket)),
    internal: String(internalOf(ticket)),
    at: String(ticket.at),
    ticket: String(ticket.id),
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Encabezado del comprobante */}

      <div className="relative isolate overflow-hidden rounded-[24px] bg-linear-to-br from-emerald-950 via-emerald-800 to-emerald-700 p-6 text-white">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/5"
        />

        <div className="relative">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <BusFront
                size={24}
                aria-hidden="true"
                className="text-emerald-200"
              />

              <span className="text-sm font-extrabold tracking-tight">
                RUTABOL-SCZ
              </span>

            </div>

            <ReceiptText
              size={23}
              aria-hidden="true"
              className="text-emerald-200/70"
            />

          </div>

          <div className="my-7 text-center">

            <p className="text-xs font-medium uppercase tracking-[0.15em] text-emerald-100/80">
              Importe del pasaje
            </p>

            <p className="mt-3 text-4xl font-extrabold tracking-tight tabular-nums">
              {bs(ticket.fare)}
            </p>

            <p className="mt-3 text-xs text-emerald-100">
              {STATUS_LONG[ticket.status]}
            </p>

          </div>

          <div className="flex items-center justify-center border-t border-white/15 pt-4 text-xs text-emerald-100">

            Comprobante de transporte urbano

          </div>

        </div>

      </div>

      {/* Información de la unidad */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

        <div className="flex items-center gap-3">

          <LineBadge
            line={lineOf(ticket)}
          />

          <div className="min-w-0 flex-1">

            <h3 className="font-bold text-slate-900">
              Línea {lineOf(ticket)}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Interno {internalOf(ticket)}
            </p>

          </div>

          <TicketStatus
            status={ticket.status}
          />

        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-600">

          <CalendarDays
            size={16}
            aria-hidden="true"
            className="text-emerald-700"
          />

          <span className="capitalize">
            {dayLabel(ticket.at)}
          </span>

          <span>·</span>

          <Clock
            size={14}
            aria-hidden="true"
          />

          {time(ticket.at)}

        </div>

      </section>

      {/* Detalle de la operación */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">

        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">

          <ReceiptText
            size={18}
            aria-hidden="true"
            className="text-emerald-700"
          />

          Información del comprobante

        </h3>

        <dl className="divide-y divide-slate-100">

          {details.map(({ label, value }) => (
            <div
              key={label}
              className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 text-xs sm:text-sm"
            >

              <dt className="text-slate-500">
                {label}
              </dt>

              <dd className="break-words text-right font-semibold text-slate-800">
                {value}
              </dd>

            </div>
          ))}

        </dl>

      </section>

      {/* Motivo de la tarifa */}

      {ticket.fareReason && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

          <GraduationCap
            size={21}
            aria-hidden="true"
            className="shrink-0 text-blue-700"
          />

          <div>

            <p className="text-xs font-bold text-blue-900">
              Información de la tarifa
            </p>

            <p className="mt-1 text-xs leading-relaxed text-blue-800">
              {ticket.fareReason}
            </p>

          </div>

        </div>
      )}

      {/* Información de trasbordo */}

      {ticket.transferredTo && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

          <Repeat
            size={22}
            aria-hidden="true"
            className="shrink-0 text-emerald-700"
          />

          <div>

            <p className="text-sm font-bold text-emerald-900">
              Trasbordo registrado
            </p>

            <p className="mt-2 text-xs leading-relaxed text-emerald-800">

              Unidad de destino:{" "}

              <strong>
                {ticket.transferredTo}
              </strong>

            </p>

            {ticket.passCode && (
              <p className="mt-2 text-xs text-emerald-800">

                Código de pase:{" "}

                <strong className="break-all">
                  {ticket.passCode}
                </strong>

              </p>
            )}

            <p className="mt-2 text-xs font-semibold text-emerald-700">
              No se cobró de nuevo.
            </p>

          </div>

        </div>
      )}

      {/* Acciones del comprobante */}

      <div className="psj-no-print space-y-3">

        <button
          type="button"
          onClick={() => window.print()}
          className={`${PRIMARY} w-full`}
        >

          <Printer
            size={19}
            aria-hidden="true"
          />

          Imprimir comprobante

        </button>

        <Link
          href={`/pasajero/reclamos?${claimQuery.toString()}`}
          className={`${OUTLINE} w-full`}
        >

          <MessageSquareWarning
            size={18}
            aria-hidden="true"
          />

          Reclamar este cobro

        </Link>

      </div>

      <p className="text-center text-[11px] leading-relaxed text-slate-400">

        Comprobante generado por el sistema
        de transporte RUTABOL-SCZ.

      </p>

    </div>
  );
}

/* =========================================
   PÁGINA PRINCIPAL DEL HISTORIAL
========================================= */

export default function Historial() {
  const { world } = useApp();

  /* Estados de búsqueda y filtros */

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [line, setLine] = useState("");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [showFilters, setShowFilters] =
    useState(true);

  const [detailId, setDetailId] =
    useState<string | null>(null);

  const tickets = world.tickets;

  /*
   * El detalle se obtiene del estado actual
   * para conservar la información actualizada.
   */

  const detail =
    tickets.find(
      (ticket) => ticket.id === detailId
    ) ?? null;

  /* =====================================
     LÍNEAS DISPONIBLES
  ===================================== */

  const lines = useMemo(
    () =>
      [...new Set(tickets.map(lineOf))].sort(
        (a, b) =>
          a.localeCompare(b, "es", {
            numeric: true,
          })
      ),
    [tickets]
  );

  /* =====================================
     VALIDAR RANGO DE FECHAS
  ===================================== */

  const invalidDates =
    !!from && !!to && from > to;

  /* =====================================
     BUSCAR Y FILTRAR VIAJES
  ===================================== */

  const filtered = useMemo(() => {
    if (invalidDates) return [];

    const start = from
      ? new Date(
          `${from}T00:00:00`
        ).getTime()
      : -Infinity;

    const end = to
      ? new Date(
          `${to}T23:59:59.999`
        ).getTime()
      : Infinity;

    const query = search
      .trim()
      .toLowerCase();

    return tickets
      .filter((ticket) => {

        /* Filtro por estado */

        if (
          status &&
          ticket.status !== status
        ) {
          return false;
        }

        /* Filtro por línea */

        if (
          line &&
          lineOf(ticket) !== line
        ) {
          return false;
        }

        /* Filtro por fecha */

        if (
          ticket.at < start ||
          ticket.at > end
        ) {
          return false;
        }

        /* Buscador instantáneo */

        if (query) {
          const text = [
            ticket.id,
            ticket.receiptNo,
            ticket.busId,
            `Línea ${lineOf(ticket)}`,
            `Interno ${internalOf(ticket)}`,
            CATEGORY_LABEL[ticket.category],
            STATUS[ticket.status].label,
            ticket.method,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!text.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) => b.at - a.at
      );

  }, [
    tickets,
    search,
    status,
    line,
    from,
    to,
    invalidDates,
  ]);

  /* =====================================
     AGRUPAR VIAJES POR FECHA
  ===================================== */

  const groups = useMemo(() => {
    const map = new Map<
      string,
      Ticket[]
    >();

    for (const ticket of filtered) {
      const label = dayLabel(ticket.at);

      const current = map.get(label);

      if (current) {
        current.push(ticket);
      } else {
        map.set(label, [ticket]);
      }
    }

    return [...map];

  }, [filtered]);

  /* =====================================
     ESTADÍSTICAS DEL HISTORIAL
  ===================================== */

  /*
   * Se conserva el cálculo original.
   * Solo cuentan pasajes pagados o abordados.
   */

  const paid = filtered.filter(
    (ticket) =>
      ticket.status === "pagado" ||
      ticket.status === "abordado"
  );

  const spent = paid.reduce(
    (total, ticket) =>
      total + ticket.fare,
    0
  );

  const saved = paid.reduce(
    (total, ticket) =>
      ticket.category === "general"
        ? total
        : total +
          Math.max(
            0,
            FARES.general - ticket.fare
          ),
    0
  );

  const hasBenefit = paid.some(
    (ticket) =>
      ticket.category !== "general"
  );

  const activeFilters = [
    status,
    line,
    from,
    to,
  ].filter(Boolean).length;

  const filtering = !!(
    search ||
    status ||
    line ||
    from ||
    to
  );

  /* =====================================
     LIMPIAR FILTROS
  ===================================== */

  function clear() {
    setSearch("");
    setStatus("");
    setLine("");
    setFrom("");
    setTo("");
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1320px] flex-col gap-5 pb-4 sm:gap-6">

      {/* =================================
          ENCABEZADO
      ================================= */}

      <div className="psj-screen-only animate-fade-up flex flex-wrap items-center justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">

            <History
              size={28}
              aria-hidden="true"
            />

          </span>

          <div className="min-w-0">

            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Actividad de transporte
            </p>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Historial de viajes
            </h1>

            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Consulta tus viajes, pagos
              y comprobantes.
            </p>

          </div>

        </div>

        <Link
          href="/pasajero"
          className={OUTLINE}
        >

          <MapPin
            size={17}
            aria-hidden="true"
            className="text-emerald-700"
          />

          Explorar micros

          <ArrowRight
            size={16}
            aria-hidden="true"
          />

        </Link>

      </div>

      {/* =================================
          INDICADORES DE ACTIVIDAD
      ================================= */}

      <div className="psj-screen-only animate-fade-up delay-100">

        <dl
          className={`grid gap-4 ${
            hasBenefit
              ? "grid-cols-2 lg:grid-cols-3"
              : "grid-cols-2"
          }`}
        >

          <StatCard
            icon={BusFront}
            label="Pasajes cobrados"
            value={String(paid.length)}
            description="Pasajes pagados o abordados."
            style="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            icon={Wallet}
            label="Importe gastado"
            value={bs(spent)}
            description="Total de pasajes cobrados."
            style="bg-blue-50 text-blue-700"
          />

          {hasBenefit && (
            <div className="col-span-2 lg:col-span-1">

              <StatCard
                icon={GraduationCap}
                label="Ahorro estudiantil"
                value={bs(saved)}
                description="Ahorro estimado frente a la tarifa general de referencia."
                style="bg-violet-50 text-violet-700"
              />

            </div>
          )}

        </dl>

        {filtering && (
          <p className="mt-3 text-xs text-slate-500">

            Los indicadores corresponden
            a los viajes filtrados.

          </p>
        )}

      </div>

      {/* =================================
          HISTORIAL VACÍO
      ================================= */}

      {tickets.length === 0 ? (
        <section className={`psj-screen-only ${CARD} p-6 sm:p-10`}>

          <EmptyState
            icon={BusFront}
            title="Todavía no pagaste ningún pasaje"
          >

            Cuando realices tu primer viaje,
            podrás consultar aquí su información
            y comprobante.

          </EmptyState>

          <div className="mt-5 flex justify-center">

            <Link
              href="/pasajero"
              className={PRIMARY}
            >

              <MapPin
                size={19}
                aria-hidden="true"
              />

              Explorar micros cercanos

              <ArrowRight
                size={17}
                aria-hidden="true"
              />

            </Link>

          </div>

        </section>
      ) : (
        <>

          {/* =============================
              PANEL DE BÚSQUEDA
          ============================= */}

          <section
            aria-label="Filtros de búsqueda"
            className={`psj-screen-only animate-fade-up delay-200 ${CARD} p-4 sm:p-6`}
          >

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                  <SlidersHorizontal
                    size={20}
                    aria-hidden="true"
                  />

                </span>

                <div>

                  <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                    Filtros de búsqueda
                  </h2>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Encuentra un viaje específico.
                  </p>

                </div>

              </div>

              {filtering && (
                <button
                  type="button"
                  onClick={clear}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >

                  <X
                    size={15}
                    aria-hidden="true"
                  />

                  Limpiar filtros

                </button>
              )}

            </div>

            {/* Buscador instantáneo */}

            <div className="flex gap-2">

              <div className="relative min-w-0 flex-1">

                <Search
                  size={19}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="ticket-search"
                  type="search"
                  aria-label="Buscar viajes"
                  placeholder="Buscar línea, interno o comprobante..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

              <button
                type="button"
                aria-label="Mostrar u ocultar filtros"
                aria-expanded={showFilters}
                aria-controls="history-filters"
                onClick={() =>
                  setShowFilters(
                    (previous) => !previous
                  )
                }
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  showFilters
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-emerald-50"
                }`}
              >

                <SlidersHorizontal
                  size={21}
                  aria-hidden="true"
                />

                {activeFilters > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 px-1 text-[10px] font-bold text-white">

                    {activeFilters}

                  </span>
                )}

              </button>

            </div>

            {/* Filtros avanzados */}

            {showFilters && (
              <div
                id="history-filters"
                className="animate-fade-in mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:grid-cols-4"
              >

                {/* Estado */}

                <div className="min-w-0">

                  <label
                    htmlFor="f-status"
                    className={LABEL}
                  >
                    Estado del viaje
                  </label>

                  <select
                    id="f-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value
                      )
                    }
                    className={INPUT}
                  >

                    <option value="">
                      Todos
                    </option>

                    {Object.entries(STATUS).map(
                      ([id, item]) => (
                        <option
                          key={id}
                          value={id}
                        >
                          {item.label}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* Línea */}

                <div className="min-w-0">

                  <label
                    htmlFor="f-line"
                    className={LABEL}
                  >
                    Línea de micro
                  </label>

                  <select
                    id="f-line"
                    value={line}
                    onChange={(event) =>
                      setLine(
                        event.target.value
                      )
                    }
                    className={INPUT}
                  >

                    <option value="">
                      Todas
                    </option>

                    {lines.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        Línea {item}
                      </option>
                    ))}

                  </select>

                </div>

                {/* Fecha inicial */}

                <div className="min-w-0">

                  <label
                    htmlFor="f-from"
                    className={LABEL}
                  >
                    Desde
                  </label>

                  <input
                    id="f-from"
                    type="date"
                    value={from}
                    max={to || undefined}
                    aria-invalid={invalidDates}
                    onChange={(event) =>
                      setFrom(
                        event.target.value
                      )
                    }
                    className={INPUT}
                  />

                </div>

                {/* Fecha final */}

                <div className="min-w-0">

                  <label
                    htmlFor="f-to"
                    className={LABEL}
                  >
                    Hasta
                  </label>

                  <input
                    id="f-to"
                    type="date"
                    value={to}
                    min={from || undefined}
                    aria-invalid={invalidDates}
                    onChange={(event) =>
                      setTo(
                        event.target.value
                      )
                    }
                    className={INPUT}
                  />

                </div>

              </div>
            )}

            {invalidDates && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                La fecha inicial no puede ser
                posterior a la fecha final.
              </p>
            )}

          </section>

          {/* =============================
              REGISTRO DE VIAJES
          ============================= */}

          <section
            aria-label="Registro de viajes"
            className={`psj-screen-only animate-fade-up delay-300 ${CARD} overflow-hidden`}
          >

            {/* Encabezado de resultados */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">

              <div className="flex items-center gap-3">

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                  <ReceiptText
                    size={23}
                    aria-hidden="true"
                  />

                </span>

                <div>

                  <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                    Registro de viajes
                  </h2>

                  <p
                    role="status"
                    className="mt-1 text-xs text-slate-500"
                  >

                    {filtering
                      ? `${filtered.length} de ${tickets.length} pasajes`
                      : `${tickets.length} pasajes registrados`}

                  </p>

                </div>

              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">

                <CalendarDays
                  size={15}
                  aria-hidden="true"
                />

                Más recientes primero

              </div>

            </div>

            {/* =========================
                SIN RESULTADOS
            ========================= */}

            {filtered.length === 0 ? (
              <div className="p-6 sm:p-10">

                <EmptyState
                  icon={SearchX}
                  title="No encontramos viajes"
                >

                  {invalidDates
                    ? "Corrige el rango de fechas para continuar."
                    : "Ningún viaje coincide con los filtros seleccionados."}

                </EmptyState>

                <div className="mt-4 flex justify-center">

                  <button
                    type="button"
                    onClick={clear}
                    className={OUTLINE}
                  >

                    <X
                      size={16}
                      aria-hidden="true"
                    />

                    Limpiar filtros

                  </button>

                </div>

              </div>
            ) : (
              <>

                {/* =====================
                    TABLA DE ESCRITORIO
                ===================== */}

                <div className="hidden overflow-x-auto lg:block">

                  <table className="w-full min-w-[760px] text-sm">

                    <caption className="sr-only">
                      Registro de pasajes
                    </caption>

                    <thead className="bg-slate-50">

                      <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">

                        <th
                          scope="col"
                          className="px-5 py-4"
                        >
                          Fecha y hora
                        </th>

                        <th
                          scope="col"
                          className="px-4 py-4"
                        >
                          Unidad
                        </th>

                        <th
                          scope="col"
                          className="px-4 py-4"
                        >
                          Categoría
                        </th>

                        <th
                          scope="col"
                          className="px-4 py-4 text-right"
                        >
                          Importe
                        </th>

                        <th
                          scope="col"
                          className="px-4 py-4"
                        >
                          Estado
                        </th>

                        <th
                          scope="col"
                          className="px-5 py-4 text-right"
                        >
                          Acciones
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filtered.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="transition-colors hover:bg-emerald-50/40"
                        >

                          {/* Fecha */}

                          <td className="px-5 py-4">

                            <p className="whitespace-nowrap text-xs font-semibold capitalize text-slate-700">

                              {dayLabel(ticket.at)}

                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">

                              <Clock
                                size={12}
                                aria-hidden="true"
                              />

                              {time(ticket.at)}

                            </p>

                          </td>

                          {/* Unidad */}

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-3">

                              <LineBadge
                                line={lineOf(ticket)}
                              />

                              <div>

                                <p className="whitespace-nowrap text-sm font-bold text-slate-900">

                                  Línea {lineOf(ticket)}

                                </p>

                                <p className="mt-1 whitespace-nowrap text-xs text-slate-500">

                                  Interno {internalOf(ticket)}

                                </p>

                              </div>

                            </div>

                          </td>

                          {/* Categoría */}

                          <td className="px-4 py-4">

                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">

                              {CATEGORY_LABEL[ticket.category]}

                            </span>

                          </td>

                          {/* Importe */}

                          <td className="whitespace-nowrap px-4 py-4 text-right font-bold tabular-nums text-slate-900">

                            {bs(ticket.fare)}

                          </td>

                          {/* Estado */}

                          <td className="px-4 py-4">

                            <TicketStatus
                              status={ticket.status}
                            />

                          </td>

                          {/* Detalle */}

                          <td className="px-5 py-4 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                setDetailId(ticket.id)
                              }
                              aria-label={`Ver detalle: línea ${lineOf(ticket)}, interno ${internalOf(ticket)}, ${bs(ticket.fare)}`}
                              className="group inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                            >

                              Detalle

                              <ChevronRight
                                size={16}
                                aria-hidden="true"
                                className="transition-transform group-hover:translate-x-1"
                              />

                            </button>

                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

                {/* =====================
                    LISTA PARA CELULARES
                ===================== */}

                <div className="flex flex-col gap-4 bg-slate-50/50 p-3 sm:p-4 lg:hidden">

                  {groups.map(([label, items]) => (
                    <section
                      key={label}
                      aria-label={label}
                    >

                      <div className="mb-2 flex items-center justify-between gap-2 px-1">

                        <h3 className="flex items-center gap-2 text-xs font-bold capitalize text-slate-600">

                          <CalendarDays
                            size={14}
                            aria-hidden="true"
                            className="text-emerald-700"
                          />

                          {label}

                        </h3>

                        <span className="text-[10px] font-medium text-slate-500">

                          {items.length}{" "}
                          {items.length === 1
                            ? "pasaje"
                            : "pasajes"}

                        </span>

                      </div>

                      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">

                        {items.map((ticket) => (
                          <MobileTicket
                            key={ticket.id}
                            ticket={ticket}
                            onSelect={() =>
                              setDetailId(ticket.id)
                            }
                          />
                        ))}

                      </ul>

                    </section>
                  ))}

                </div>

                {/* Pie de resultados */}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">

                  <p className="text-xs text-slate-500">

                    Mostrando {filtered.length}{" "}
                    {filtered.length === 1
                      ? "registro"
                      : "registros"}

                  </p>

                  <p className="text-xs font-semibold text-slate-700">

                    Total cobrado:{" "}

                    <span className="font-extrabold tabular-nums text-emerald-700">

                      {bs(spent)}

                    </span>

                  </p>

                </div>

              </>
            )}

          </section>

        </>
      )}

      {/* =================================
          INFORMACIÓN SOBRE EL HISTORIAL
      ================================= */}

      <div className="psj-screen-only flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">

        <CircleCheck
          size={23}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-emerald-700"
        />

        <div>

          <p className="text-sm font-bold text-emerald-900">
            Tus viajes, en un solo lugar
          </p>

          <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
            Consulta los detalles de cada pasaje,
            imprime tu comprobante o presenta
            un reclamo si encuentras un cobro
            incorrecto.
          </p>

        </div>

      </div>

      {/* =================================
          VENTANA DE DETALLE DEL VIAJE
      ================================= */}

      <Sheet
        open={!!detail}
        onClose={() => setDetailId(null)}
        title="Detalle del viaje"
      >

        {detail && (
          <TicketReceipt
            ticket={detail}
          />
        )}

      </Sheet>

    </div>
  );
}
