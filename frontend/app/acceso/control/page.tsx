"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { PasswordInput, SubmitButton, TextField } from "@/components/auth/fields";
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
    <AuthFrame
      icon={LayoutDashboard}
      title="Centro de Control"
      subtitle="Ingresa para consultar el estado del sistema y gestionar el servicio."
      message="Visibilidad completa del servicio, en tiempo real."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <TextField id="control-id" label="Identificador" autoComplete="username" value={id}
          onChange={(event) => setId(event.target.value)} required disabled={busy} />
        <PasswordInput id="control-password" autoComplete="current-password"
          value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
        <ErrorNote text={error} />
        <SubmitButton busy={busy} busyText="Ingresando…" />
      </form>
    </AuthFrame>
  );
}
