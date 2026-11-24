"use client";

import { useState } from "react";
import { BadgeCheck, Check, CircleAlert, Clock, GraduationCap, MailCheck, XCircle } from "lucide-react";
import { ErrorState, Notice, Skeleton, StatusPill, type Tone } from "@/components/pasajero/ui";
import { api, useFetch } from "@/lib/api";
import { useApp, type Accreditation } from "@/lib/store";

type Institution = { id: string; type: "colegio" | "universidad"; name: string };

// "revocada" aún no existe en el backend: se contempla por si se agrega.
const STATUS: Record<string, { label: string; tone: Tone; icon: typeof Clock; help: string }> = {
  pendiente: { label: "Pendiente", tone: "warn", icon: Clock, help: "El Centro de Control está revisando tu solicitud. Mientras tanto pagas la tarifa general." },
  aprobada: { label: "Aprobada", tone: "success", icon: BadgeCheck, help: "Tienes la tarifa estudiantil mientras tu acreditación esté vigente." },
  observada: { label: "Observada", tone: "warn", icon: CircleAlert, help: "Corrige lo indicado en la observación y vuelve a enviar tu solicitud." },
  rechazada: { label: "Rechazada", tone: "danger", icon: XCircle, help: "Puedes enviar una nueva solicitud con datos correctos." },
  vencida: { label: "Vencida", tone: "danger", icon: XCircle, help: "Renueva tu acreditación para recuperar la tarifa estudiantil." },
  revocada: { label: "Revocada", tone: "danger", icon: XCircle, help: "Tu acreditación fue revocada. Puedes enviar una nueva solicitud." },
};

/** Paso actual del proceso según el estado real de la solicitud. */
function currentStep(acc: Accreditation | null | undefined) {
  if (!acc) return 0;
  if (acc.type === "universitario" && !acc.emailVerified && acc.status === "pendiente") return 1;
  if (acc.status === "pendiente") return 2;
  return 3;
}

function Stepper({ step, university }: { step: number; university: boolean }) {
  const steps = ["Datos", ...(university ? ["Correo"] : []), "Revisión", "Resultado"];
  // Sin paso de correo (escolar), Revisión y Resultado se desplazan un lugar.
  const idx = university ? step : Math.max(0, step - 1);
  return (
    <ol aria-label="Progreso de la acreditación" className="flex items-center">
      {steps.map((label, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={active ? "step" : undefined}>
            <span className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-(--psj-green) text-white" : active ? "border-2 border-(--psj-green) bg-(--psj-green-soft) text-(--psj-green-dark)" : "border border-(--psj-line) bg-(--psj-surface) text-(--psj-muted-strong)"
                }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`text-xs ${active ? "font-semibold" : "text-(--psj-muted-strong)"}`}>{label}</span>
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className={`mx-2 mb-5 h-0.5 flex-1 ${done ? "bg-(--psj-green)" : "bg-(--psj-line)"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Acreditacion() {
  const { profile, devCode: registerCode, reloadProfile } = useApp();
  const { data: acc, loading, reload } = useFetch<Accreditation | null>("/accreditation/me", 6000);
  const catalog = useFetch<Institution[]>(
    profile?.category === "escolar" || profile?.category === "universitario" ? "/public/institutions" : null,
  );
  const [institution, setInstitution] = useState("");
  const [institutionalCode, setInstitutionalCode] = useState("");
  const [code, setCode] = useState("");
  const [mailCode, setMailCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(registerCode);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (profile?.category === "general") {
    return (
      <div className="psj-card mx-auto max-w-xl p-4 text-sm text-(--psj-muted-strong)">
        <h1 className="mb-2 text-lg font-semibold text-(--psj-ink)">Acreditación estudiantil</h1>
        Tu cuenta es de categoría general y paga la tarifa general. Si eres estudiante, crea una cuenta escolar o
        universitaria.
      </div>
    );
  }

  const type = profile?.category === "escolar" ? "escolar" : "universitario";
  const st = acc ? (STATUS[acc.status] ?? STATUS.pendiente) : null;
  const institutions = catalog.data?.filter((item) => item.type === (type === "escolar" ? "colegio" : "universidad")) ?? [];
  const step = currentStep(acc);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const r = await api<{ devCode?: string }>("/accreditation/request", "POST", {
        institution, code, ...(type === "universitario" ? { institutionalCode } : {}),
      });
      setDevCode(r.devCode ?? null);
      setOk("Solicitud enviada.");
      void reload();
      void reloadProfile();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/accreditation/confirm-email", "POST", { code: mailCode });
      setOk("Correo confirmado.");
      setDevCode(null);
      void reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="sr-only">Acreditación {type === "escolar" ? "escolar (RUDE)" : "universitaria"}</h1>

      <section className="psj-card p-4" aria-label="Progreso">
        <Stepper step={step} university={type === "universitario"} />
      </section>

      {loading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : acc && st ? (
        <section className="psj-card flex flex-col gap-2 p-4" aria-label="Estado de la solicitud">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{acc.institution || "Sin institución"}</span>
            <StatusPill tone={st.tone}>
              <st.icon size={12} aria-hidden="true" />
              {st.label}
            </StatusPill>
          </div>
          <p className="text-sm text-(--psj-muted-strong)">{st.help}</p>
          {acc.note && <p className="rounded-lg bg-(--psj-warn-soft) p-2 text-sm text-[#92400e]">Observación: {acc.note}</p>}
          {acc.validUntil && <p className="text-sm">Vigente hasta {new Date(acc.validUntil).toLocaleDateString("es-BO")}</p>}
          {acc.type === "universitario" && (
            <p className="flex items-center gap-2 text-sm">
              <MailCheck size={16} aria-hidden="true" className={acc.emailVerified ? "text-(--psj-green)" : "text-(--psj-muted-strong)"} />
              Correo institucional {acc.emailVerified ? "confirmado" : "sin confirmar"}
            </p>
          )}
        </section>
      ) : (
        <p className="psj-card p-4 text-sm text-(--psj-muted-strong)">Todavía no tienes una solicitud de acreditación.</p>
      )}

      <section className="psj-card flex items-start gap-3 p-4" aria-label="Verificación académica">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--psj-bg) text-(--psj-muted-strong)">
          <GraduationCap size={20} aria-hidden="true" />
        </span>
        <div className="text-sm">
          <p className="flex items-center gap-2 font-semibold">
            Verificación académica
            <StatusPill tone="neutral">Próximamente</StatusPill>
          </p>
          <p className="text-(--psj-muted-strong)">Más adelante podrás validar tu matrícula directamente con tu institución. Por ahora, el Centro de Control revisa cada solicitud.</p>
        </div>
      </section>

      {acc && acc.type === "universitario" && !acc.emailVerified && (
        <form onSubmit={confirm} className="psj-card flex flex-col gap-3 p-4">
          <h2 className="font-semibold">Confirmar correo institucional</h2>
          <p className="text-sm text-(--psj-muted-strong)">Ingresa el código que enviamos a tu correo.</p>
          {devCode && (
            <p className="rounded-lg bg-(--psj-green-soft) p-2 text-xs">
              Correo simulado. Tu código de prueba es <span className="font-mono font-semibold">{devCode}</span>.
            </p>
          )}
          <div>
            <label htmlFor="mc" className="psj-label">Código de confirmación</label>
            <input id="mc" className="psj-input" value={mailCode} onChange={(e) => setMailCode(e.target.value)} required inputMode="numeric" />
          </div>
          <button className="psj-btn psj-btn-primary">Confirmar correo</button>
        </form>
      )}

      <form onSubmit={request} className="psj-card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">{acc ? "Renovar o corregir solicitud" : "Solicitar acreditación"}</h2>
        <div>
          <label htmlFor="inst" className="psj-label">{type === "escolar" ? "Unidad educativa" : "Universidad"}</label>
          <select id="inst" className="psj-input" value={institution} onChange={(e) => setInstitution(e.target.value)}
            required disabled={catalog.loading || !!catalog.error || !institutions.length}>
            <option value="">{catalog.loading ? "Cargando instituciones…" : "Selecciona una institución"}</option>
            {institutions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
          {catalog.error && <div className="mt-2"><ErrorState message={catalog.error} onRetry={() => void catalog.reload()} /></div>}
          {!catalog.loading && !catalog.error && !institutions.length &&
            <p className="mt-2 text-sm text-(--psj-muted-strong)">No hay instituciones habilitadas para esta categoría.</p>}
        </div>
        <div>
          <label htmlFor="cd" className="psj-label">{type === "escolar" ? "Código RUDE" : "Correo institucional"}</label>
          <input id="cd" className="psj-input" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        {type === "universitario" && (
          <div>
            <label htmlFor="institutional-code" className="psj-label">Código institucional</label>
            <input id="institutional-code" className="psj-input" value={institutionalCode}
              onChange={(e) => setInstitutionalCode(e.target.value)} required maxLength={70} />
          </div>
        )}
        {error && <ErrorState message={error} />}
        {ok && <Notice>{ok}</Notice>}
        <button className="psj-btn psj-btn-primary" disabled={catalog.loading || !!catalog.error || !institutions.length}>Enviar solicitud</button>
        <p className="text-xs text-(--psj-muted-strong)">
          El código por sí solo no acredita tu condición: el Centro de Control revisa y aprueba cada solicitud.
        </p>
      </form>
    </div>
  );
}
