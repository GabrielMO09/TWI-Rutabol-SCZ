"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { useApp } from "@/lib/store";

export default function LoginChofer() {
  const { loginDriver, lines } = useApp();
  const router = useRouter();
  const [chosen, setChosen] = useState("");
  const line = chosen || lines[0]?.id || ""; // las líneas vienen de la API (/public/lines)
  const [internal, setInternal] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = await loginDriver(line, internal, pin);
    if (err) setError(err);
    else {
      setInternal("");
      setPin(""); // la página conserva su estado al salir; el próximo ingreso arranca en blanco
      router.replace("/chofer");
    }
  }

  return (
    <AuthFrame
      title="Ingreso de chofer"
      subtitle="Necesitas la línea y el número interno que te asignó la administración."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="line" className="label">Línea de micro</label>
          <select id="line" className="input" value={line} onChange={(e) => setChosen(e.target.value)}>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="int" className="label">Número interno</label>
          <input id="int" className="input" inputMode="numeric" value={internal} onChange={(e) => setInternal(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="pin" className="label">PIN</label>
          <input id="pin" type="password" inputMode="numeric" className="input" value={pin} onChange={(e) => setPin(e.target.value)} required />
        </div>
        <ErrorNote text={error} />
        <button className="btn btn-primary">
          <LogIn size={16} />
          Ingresar
        </button>
      </form>
    </AuthFrame>
  );
}
