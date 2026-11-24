"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { PasswordInput, SubmitButton, TextField } from "@/components/auth/fields";
import { useApp } from "@/lib/store";

export default function LoginPasajero() {
  const { loginPassenger } = useApp();
  const router = useRouter();
  const lock = useRef(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const err = await loginPassenger(id, password);
    lock.current = false;
    setBusy(false);
    if (err) setError(err);
    else {
      setId("");
      setPassword(""); // la página conserva su estado al salir; el próximo ingreso arranca en blanco
      router.replace("/pasajero");
    }
  }

  return (
    <AuthFrame
      icon={GraduationCap}
      title="Ingreso de estudiante"
      subtitle="Usa tu código RUDE, correo institucional o CI."
      message="Tu pasaje, tu carnet y tus rutas en un solo lugar."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <TextField label="Código RUDE, correo institucional o CI" value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" disabled={busy} />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" disabled={busy} />
        <ErrorNote text={error} />
        <SubmitButton busy={busy} />
        <Link href="/registro" className="psj-btn psj-btn-outline w-full">Crear cuenta</Link>
        <Link href="/acceso/recuperar" className="psj-btn psj-btn-ghost w-full text-(--psj-green)">¿Olvidaste tu contraseña?</Link>
      </form>
    </AuthFrame>
  );
}
