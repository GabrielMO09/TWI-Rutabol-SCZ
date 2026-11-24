"use client";

import Link from "next/link";
import { useState } from "react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { api } from "@/lib/api";

export default function Recuperar() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ devCode?: string }>("/auth/recovery/request", "POST", { id });
      setDevCode(r.devCode ?? null);
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/auth/recovery/confirm", "POST", { id, code, newPassword: password });
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AuthFrame title="Recuperar contraseña" subtitle="Te enviaremos un código a tu correo registrado." back="/acceso/pasajero">
      {step === 1 && (
        <form onSubmit={request} className="flex flex-col gap-4">
          <div>
            <label htmlFor="id" className="psj-label">Código RUDE, correo institucional o CI</label>
            <input id="id" className="psj-input" value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" />
          </div>
          <ErrorNote text={error} />
          <button className="psj-btn psj-btn-primary">Enviar código</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <p className="text-sm text-(--psj-muted-strong)">Si la cuenta existe, enviamos un código de verificación.</p>
          {devCode && (
            <p className="rounded-lg bg-(--psj-green-soft) p-3 text-xs">
              Correo simulado. Tu código de prueba es <span className="font-mono font-semibold">{devCode}</span>.
            </p>
          )}
          <div>
            <label htmlFor="cd" className="psj-label">Código de verificación</label>
            <input id="cd" className="psj-input" value={code} onChange={(e) => setCode(e.target.value)} required inputMode="numeric" />
          </div>
          <div>
            <label htmlFor="pw" className="psj-label">Contraseña nueva</label>
            <input id="pw" type="password" className="psj-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <ErrorNote text={error} />
          <button className="psj-btn psj-btn-primary">Cambiar contraseña</button>
        </form>
      )}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-lg bg-(--psj-green-soft) p-3 text-sm text-(--psj-green-dark)">Tu contraseña fue actualizada.</p>
          <Link href="/acceso/pasajero" className="psj-btn psj-btn-primary">Ir a iniciar sesión</Link>
        </div>
      )}
    </AuthFrame>
  );
}
