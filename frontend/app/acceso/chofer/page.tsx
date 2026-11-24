"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bus } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { PasswordInput, SubmitButton, TextField } from "@/components/auth/fields";
import { useApp } from "@/lib/store";

export default function LoginChofer() {
  const { loginDriver, lines } = useApp();
  const router = useRouter();
  const lock = useRef(false);
  const [chosen, setChosen] = useState("");
  const line = chosen || lines[0]?.id || ""; // las líneas vienen de la API (/public/lines)
  const [internal, setInternal] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const err = await loginDriver(line, internal, pin);
    lock.current = false;
    setBusy(false);
    if (err) setError(err);
    else {
      setInternal("");
      setPin(""); // la página conserva su estado al salir; el próximo ingreso arranca en blanco
      router.replace("/chofer");
    }
  }

  return (
    <AuthFrame
      icon={Bus}
      title="Ingreso de conductor"
      subtitle="Necesitas la línea y el número interno que te asignó la administración."
      message="Cada viaje, bajo control y con el aforo al día."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <div>
          <label htmlFor="line" className="psj-label">Línea de micro</label>
          <select id="line" className="psj-input" value={line} onChange={(e) => setChosen(e.target.value)} disabled={busy}>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <TextField id="int" label="Número interno" inputMode="numeric" value={internal} onChange={(e) => setInternal(e.target.value)} required disabled={busy} />
        <PasswordInput id="pin" label="PIN" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} required disabled={busy} />
        <ErrorNote text={error} />
        <SubmitButton busy={busy} />
      </form>
    </AuthFrame>
  );
}
