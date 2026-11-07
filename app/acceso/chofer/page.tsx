"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { DRIVERS, LINES } from "@/lib/data";
import { useApp } from "@/lib/store";

export default function LoginChofer() {
  const { loginDriver } = useApp();
  const router = useRouter();
  const [line, setLine] = useState(LINES[0].id);
  const [internal, setInternal] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = loginDriver(line, internal, pin);
    if (err) setError(err);
    else router.replace("/chofer");
  }

  return (
    <AuthFrame
      title="Ingreso de chofer"
      subtitle="Necesitas la línea y el número interno que te asignó la administración."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="line" className="label">Línea de micro</label>
          <select id="line" className="input" value={line} onChange={(e) => setLine(e.target.value)}>
            {LINES.map((l) => (
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
      <p className="mt-6 rounded-lg bg-soft p-3 text-xs text-muted">
        Asignaciones de prueba (PIN 1234):{" "}
        {DRIVERS.map((d) => `Línea ${d.line} / ${d.internal}`).join(", ")}
      </p>
    </AuthFrame>
  );
}
