"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { useApp } from "@/lib/store";

export default function LoginControl() {
  const { loginControl } = useApp();
  const router = useRouter();
  const lock = useRef(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError(null);
    if (!id.trim() || !password) {
      setError("Ingresa tu identificador y contraseña.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const failure = await loginControl(id.trim(), password);
      if (failure) setError(failure);
      else {
        // cacheComponents conserva el estado de esta página al salir: se limpia para que el próximo ingreso arranque en blanco.
        setId("");
        setPassword("");
        router.replace("/control");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo iniciar sesión.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Centro de Control" subtitle="Ingresa para consultar el estado del sistema y gestionar el servicio.">
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <div>
          <label htmlFor="control-id" className="label">Identificador</label>
          <input id="control-id" className="input" autoComplete="username" value={id}
            onChange={(event) => setId(event.target.value)} required disabled={busy} />
        </div>
        <div>
          <label htmlFor="control-password" className="label">Contraseña</label>
          <input id="control-password" type="password" className="input" autoComplete="current-password"
            value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
        </div>
        <ErrorNote text={error} />
        <button className="btn btn-primary" disabled={busy}>
          <LogIn size={18} aria-hidden="true" />{busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthFrame>
  );
}
