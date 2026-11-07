"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { DEMO_STUDENT } from "@/lib/data";
import { useApp } from "@/lib/store";

export default function LoginPasajero() {
  const { loginPassenger } = useApp();
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await loginPassenger(id, password);
    setBusy(false);
    if (err) setError(err);
    else router.replace("/pasajero");
  }

  return (
    <AuthFrame title="Ingreso de estudiante" subtitle="Usa tu código RUDE, correo @upds.edu.bo o CI.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="id" className="label">Código RUDE, correo institucional o CI</label>
          <input id="id" className="input" value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" />
        </div>
        <div>
          <label htmlFor="pw" className="label">Contraseña</label>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <ErrorNote text={error} />
        <button className="btn btn-primary" disabled={busy}>
          <LogIn size={16} />
          {busy ? "Verificando..." : "Ingresar"}
        </button>
        <Link href="/registro" className="btn btn-outline">Crear cuenta</Link>
      </form>
      <p className="mt-6 rounded-lg bg-soft p-3 text-xs text-muted">
        Cuenta de prueba: <span className="font-mono text-ink">{DEMO_STUDENT.id}</span> / <span className="font-mono text-ink">{DEMO_STUDENT.password}</span>
      </p>
    </AuthFrame>
  );
}
