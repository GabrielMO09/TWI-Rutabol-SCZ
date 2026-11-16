"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { BadgeCheck, CircleAlert, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { CATEGORY_LABEL } from "@/lib/data";
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
      const c = await api<Credential>("/credentials/me");
      setCred(c);
      setError(null);
      setQr(await QRCode.toDataURL(c.token, { margin: 1, width: 220, color: { dark: "#0f3d24", light: "#ffffff" } }));
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

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      <h1 className="text-lg font-semibold">Carnet digital</h1>
      <article className="card overflow-hidden">
        <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
          <span className="text-sm font-semibold tracking-wide">RUTABOL-SCZ</span>
          <span className="chip bg-white/20 text-white">{CATEGORY_LABEL[profile.category ?? "general"]}</span>
        </div>
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-line bg-soft text-muted">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt={`Fotografía de ${profile.name}`} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={64} />
            )}
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.name}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm">
              {vigente ? <BadgeCheck size={16} className="text-brand" /> : <CircleAlert size={16} className="text-warn" />}
              {student
                ? vigente
                  ? `Acreditación vigente · tarifa ${CATEGORY_LABEL[profile.fareCategory ?? "general"].toLowerCase()}`
                  : "Acreditación no vigente · tarifa general"
                : "Tarifa general"}
            </p>
          </div>
        </div>
        <div className="border-t border-line bg-soft p-4">
          <div className="flex flex-col items-center gap-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Código QR temporal para validar tu identidad" width={220} height={220} className="rounded-lg bg-white" />
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-muted">
                {error ? "Sin código" : "Generando código..."}
              </div>
            )}
            <p className="flex items-center gap-2 text-sm font-medium text-brand-dark">
              <ShieldCheck size={16} />
              Código temporal · vence en {left} s
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-brand transition-all" style={{ width: `${(left / 60) * 100}%` }} />
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
          <button className="btn btn-outline mt-3 h-9 w-full" onClick={() => void load()}>
            <RefreshCw size={16} />
            Generar un código nuevo
          </button>
          <p className="mt-2 text-xs text-muted">
            El código lo firma el servidor, no incluye tu RUDE ni tu correo y solo puede usarse una vez. Una captura de
            pantalla no sirve para abordar.
          </p>
        </div>
      </article>
    </div>
  );
}
