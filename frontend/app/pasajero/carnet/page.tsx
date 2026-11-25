"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { BadgeCheck, CircleAlert, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { ErrorState, Skeleton, StatusPill } from "@/components/pasajero/ui";
import { api } from "@/lib/api";
import { bs } from "@/components/pasajero/format";
import { CATEGORY_LABEL, FARES } from "@/lib/data";
import { useApp } from "@/lib/store";

interface Credential {
  token: string;
  expiresAt: number;
  category: "escolar" | "universitario" | "general";
  fareCategory: "escolar" | "universitario" | "general";
  status: string;
}

export default function Carnet() {
  const { profile } = useApp();
  const [cred, setCred] = useState<Credential | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const c = await api<Credential>("/credentials/me", "POST");
      setCred(c);
      setError(null);
      setQr(await QRCode.toDataURL(c.token, { margin: 1, width: 220, color: { dark: "#103E2C", light: "#ffffff" } }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // El código dura 60 s: se renueva solo poco antes de vencer.
  useEffect(() => {
    if (cred && cred.expiresAt - now < 5000) void load();
  }, [cred, now, load]);

  if (!profile) return null;
  const left = cred ? Math.max(0, Math.ceil((cred.expiresAt - now) / 1000)) : 0;
  const student = profile.category !== "general";
  const vigente = profile.fareCategory === profile.category;
  const acc = profile.accreditation;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 lg:grid lg:max-w-[1200px] lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-x-6 lg:gap-y-5">
      <h1 className="sr-only">Carnet digital</h1>
      <div className="hidden lg:col-span-2 lg:block">
        <p className="text-2xl font-semibold">Tu credencial estudiantil</p>
        <p className="text-sm text-(--psj-muted-strong)">Identifícate y accede a tu tarifa preferencial</p>
      </div>
      <article className="psj-card psj-card-shadow overflow-hidden">
        <div className="flex items-center justify-between bg-(--psj-green-dark) px-4 py-3 text-white">
          <span className="text-sm font-semibold tracking-wide">RUTABOL-SCZ</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{CATEGORY_LABEL[profile.category ?? "general"]}</span>
        </div>
        <div className="flex flex-col items-center gap-3 p-5">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-(--psj-line) bg-(--psj-green-soft) text-(--psj-green)">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt={`Fotografía de ${profile.name}`} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={56} aria-hidden="true" />
            )}
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.name}</p>
            <div className="mt-2 flex justify-center">
              <StatusPill tone={student && !vigente ? "warn" : "success"}>
                {vigente ? <BadgeCheck size={12} aria-hidden="true" /> : <CircleAlert size={12} aria-hidden="true" />}
                {student ? (vigente ? "Acreditación vigente" : "Acreditación no vigente") : "Cuenta general"}
              </StatusPill>
            </div>
            <p className="mt-2 text-sm text-(--psj-muted-strong)">
              Tarifa {CATEGORY_LABEL[profile.fareCategory ?? "general"].toLowerCase()}
              {acc?.validUntil && vigente ? ` · hasta ${new Date(acc.validUntil).toLocaleDateString("es-BO")}` : ""}
            </p>
            {acc?.institution && <p className="text-xs text-(--psj-muted-strong)">{acc.institution}</p>}
          </div>
        </div>
        <div className="border-t border-(--psj-line) bg-(--psj-bg) p-4">
          <div className="flex flex-col items-center gap-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Código QR temporal para validar tu identidad" width={220} height={220} className="rounded-lg bg-white" />
            ) : error ? null : (
              <Skeleton className="h-[220px] w-[220px] rounded-lg" />
            )}
            <p className="flex items-center gap-2 text-sm font-medium text-(--psj-green-dark)">
              <ShieldCheck size={16} aria-hidden="true" />
              Código temporal · vence en {left} s
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--psj-line)" aria-hidden="true">
            <div className="h-full bg-(--psj-green) transition-all" style={{ width: `${(left / 60) * 100}%` }} />
          </div>
          {error && <div className="mt-3"><ErrorState message={error} onRetry={() => void load()} /></div>}
          <button type="button" className="psj-btn psj-btn-outline mt-3 w-full" onClick={() => void load()}>
            <RefreshCw size={16} aria-hidden="true" />
            Generar un código nuevo
          </button>
          <p className="mt-3 text-xs text-(--psj-muted-strong)">
            El código lo firma el servidor, no incluye tu RUDE ni tu correo y solo puede usarse una vez. Una captura de
            pantalla no sirve para abordar.
          </p>
        </div>
      </article>

      <aside aria-label="Información del carnet" className="hidden flex-col gap-4 lg:flex">
        <section className="psj-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Información de acreditación</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-(--psj-muted-strong)">Estado</dt>
            <dd className="text-right">
              <StatusPill tone={student && !vigente ? "warn" : "success"}>
                {student ? (vigente ? "Acreditación vigente" : "Acreditación no vigente") : "Cuenta general"}
              </StatusPill>
            </dd>
            <dt className="text-(--psj-muted-strong)">Institución</dt>
            <dd className="text-right font-medium">{acc?.institution || "-"}</dd>
            <dt className="text-(--psj-muted-strong)">Beneficio</dt>
            <dd className="text-right font-medium">{vigente && student ? "Tarifa estudiantil vigente" : "Sin beneficio estudiantil"}</dd>
            <dt className="text-(--psj-muted-strong)">Tarifa preferencial</dt>
            <dd className="text-right font-medium tabular-nums">
              {bs(FARES[profile.fareCategory ?? "general"])} · {CATEGORY_LABEL[profile.fareCategory ?? "general"].toLowerCase()}
            </dd>
            {acc?.validUntil && vigente && (
              <>
                <dt className="text-(--psj-muted-strong)">Válido hasta</dt>
                <dd className="text-right font-medium">{new Date(acc.validUntil).toLocaleDateString("es-BO")}</dd>
              </>
            )}
          </dl>
        </section>
        <section className="psj-card p-5">
          <h2 className="mb-4 text-lg font-semibold">¿Cómo utilizar tu carnet?</h2>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-(--psj-muted-strong)">
            <li>Paga tu pasaje desde la sección Pagar pasaje.</li>
            <li>Al abordar, presenta este código QR al conductor.</li>
            <li>El conductor lo escanea y valida tu identidad y tu beneficio.</li>
            <li>El código vence en 60 s y se renueva solo; si no carga, genera uno nuevo.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
