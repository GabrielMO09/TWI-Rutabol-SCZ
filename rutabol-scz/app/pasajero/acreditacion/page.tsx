"use client";

import { useState } from "react";
import { BadgeCheck, CircleAlert, Clock, MailCheck, XCircle } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { api, useFetch } from "@/lib/api";
import { useApp, type Accreditation, type AccStatus } from "@/lib/store";

const STATUS: Record<AccStatus, { label: string; style: string; help: string }> = {
  pendiente: { label: "Pendiente", style: "bg-amber-100 text-amber-800", help: "El Centro de Control está revisando tu solicitud. Mientras tanto pagas la tarifa general." },
  aprobada: { label: "Aprobada", style: "bg-green-100 text-green-800", help: "Tienes la tarifa estudiantil mientras tu acreditación esté vigente." },
  observada: { label: "Observada", style: "bg-amber-100 text-amber-800", help: "Corrige lo indicado en la observación y vuelve a enviar tu solicitud." },
  rechazada: { label: "Rechazada", style: "bg-red-100 text-red-800", help: "Puedes enviar una nueva solicitud con datos correctos." },
  vencida: { label: "Vencida", style: "bg-red-100 text-red-800", help: "Renueva tu acreditación para recuperar la tarifa estudiantil." },
};

export default function Acreditacion() {
  const { profile, devCode: registerCode, reloadProfile } = useApp();
  const { data: acc, loading, reload } = useFetch<Accreditation | null>("/accreditation/me", 6000);
  const [institution, setInstitution] = useState("");
  const [code, setCode] = useState("");
  const [mailCode, setMailCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(registerCode);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (profile?.category === "general") {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-semibold">Acreditación estudiantil</h1>
        <p className="card p-4 text-sm text-muted">
          Tu cuenta es de categoría general y paga la tarifa general. Si eres estudiante, crea una cuenta escolar o
          universitaria.
        </p>
      </div>
    );
  }

  const type = profile?.category === "escolar" ? "escolar" : "universitario";
  const st = acc ? STATUS[acc.status] : null;

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const r = await api<{ devCode?: string }>("/accreditation/request", "POST", { institution, code });
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
      <h1 className="text-2xl font-semibold">Acreditación {type === "escolar" ? "escolar (RUDE)" : "universitaria"}</h1>

      {loading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : acc && st ? (
        <section className="card p-4" aria-label="Estado de la solicitud">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{acc.institution || "Sin institución"}</span>
            <span className={`chip ${st.style}`}>
              {acc.status === "aprobada" ? <BadgeCheck size={12} /> : acc.status === "pendiente" ? <Clock size={12} /> : acc.status === "observada" ? <CircleAlert size={12} /> : <XCircle size={12} />}
              {st.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">{st.help}</p>
          {acc.note && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-warn">Observación: {acc.note}</p>}
          {acc.validUntil && <p className="mt-2 text-sm">Vigente hasta {new Date(acc.validUntil).toLocaleDateString("es-BO")}</p>}
          {acc.type === "universitario" && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <MailCheck size={16} className={acc.emailVerified ? "text-brand" : "text-muted"} />
              Correo institucional {acc.emailVerified ? "confirmado" : "sin confirmar"}
            </p>
          )}
        </section>
      ) : (
        <p className="card p-4 text-sm text-muted">Todavía no tienes una solicitud de acreditación.</p>
      )}

      {acc && acc.type === "universitario" && !acc.emailVerified && (
        <form onSubmit={confirm} className="card flex flex-col gap-3 p-4">
          <h2 className="font-semibold">Confirmar correo institucional</h2>
          <p className="text-sm text-muted">Ingresa el código que enviamos a tu correo.</p>
          {devCode && (
            <p className="rounded-lg bg-soft p-2 text-xs">
              Correo simulado. Tu código de prueba es <span className="font-mono font-semibold">{devCode}</span>.
            </p>
          )}
          <div>
            <label htmlFor="mc" className="label">Código de confirmación</label>
            <input id="mc" className="input" value={mailCode} onChange={(e) => setMailCode(e.target.value)} required inputMode="numeric" />
          </div>
          <button className="btn btn-primary">Confirmar correo</button>
        </form>
      )}

      <form onSubmit={request} className="card flex flex-col gap-3 p-4">
        <h2 className="font-semibold">{acc ? "Renovar o corregir solicitud" : "Solicitar acreditación"}</h2>
        <div>
          <label htmlFor="inst" className="label">{type === "escolar" ? "Unidad educativa" : "Universidad"}</label>
          <input id="inst" className="input" value={institution} onChange={(e) => setInstitution(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="cd" className="label">{type === "escolar" ? "Código RUDE" : "Correo institucional (@upds.edu.bo)"}</label>
          <input id="cd" className="input" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <ErrorNote text={error} />
        {ok && <p role="status" className="rounded-lg bg-soft px-3 py-2 text-sm text-brand-dark">{ok}</p>}
        <button className="btn btn-primary">Enviar solicitud</button>
        <p className="text-xs text-muted">
          El código por sí solo no acredita tu condición: el Centro de Control revisa y aprueba cada solicitud.
        </p>
      </form>
    </div>
  );
}
