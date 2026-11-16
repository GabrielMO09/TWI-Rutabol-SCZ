"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Camera, UserRound } from "lucide-react";
import AuthFrame, { ErrorNote } from "@/components/AuthFrame";
import { CATEGORY_LABEL, FARES, type Category } from "@/lib/data";
import { useApp } from "@/lib/store";

const CODE_FIELD: Record<Category, { label: string; placeholder: string }> = {
  escolar: { label: "Código RUDE", placeholder: "Ej. 80480123456" },
  universitario: { label: "Correo institucional", placeholder: "nombre@upds.edu.bo" },
  general: { label: "Número de CI", placeholder: "Ej. 7654321" },
};

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const side = Math.min(img.width, img.height);
      canvas
        .getContext("2d")!
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = url;
  });
}

export default function Registro() {
  const { registerStudent } = useApp();
  const router = useRouter();
  const [category, setCategory] = useState<Category>("universitario");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState("");
  const [institution, setInstitution] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = CODE_FIELD[category];

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPhoto(await resizePhoto(f));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await registerStudent({ name, category, code, password, photo, acceptTerms, institution });
    setBusy(false);
    if (err) setError(err);
    else router.replace(category === "general" ? "/pasajero" : "/pasajero/acreditacion");
  }

  return (
    <AuthFrame
      title="Crear cuenta"
      subtitle="La tarifa estudiantil se aplica cuando tu acreditación es aprobada."
      back="/acceso/pasajero"
      wide
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset>
          <legend className="label">Categoría</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => {
                  setCategory(c);
                  setCode("");
                }}
                aria-pressed={category === c}
                className={`rounded-lg border px-2 py-2.5 text-sm font-medium ${
                  category === c ? "border-brand bg-soft text-brand-dark" : "border-line hover:bg-soft"
                }`}
              >
                {CATEGORY_LABEL[c]}
                <span className="block text-xs font-normal text-muted">Bs {FARES[c].toFixed(2)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="label">Nombre completo</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="code" className="label">{field.label}</label>
          <input id="code" className="input" placeholder={field.placeholder} value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        {category !== "general" && (
          <div>
            <label htmlFor="inst" className="label">{category === "escolar" ? "Unidad educativa" : "Universidad"}</label>
            <input id="inst" className="input" value={institution} onChange={(e) => setInstitution(e.target.value)} required />
          </div>
        )}
        <div>
          <label htmlFor="pw" className="label">Contraseña</label>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
        </div>

        <div>
          <span className="label">Fotografía del rostro (obligatoria)</span>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-soft text-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Vista previa de tu fotografía" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={32} />
              )}
            </div>
            <label htmlFor="photo" className="btn btn-outline cursor-pointer">
              <Camera size={16} />
              {photo ? "Cambiar foto" : "Subir foto"}
            </label>
            <input id="photo" type="file" accept="image/*" capture="user" className="sr-only" onChange={onPhoto} />
          </div>
          <p className="mt-2 text-xs text-muted">Se usa para generar tu carnet digital antifraude.</p>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--g600)]" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
          <span>
            Acepto los <Link href="/terminos" className="font-medium text-brand underline">términos de uso</Link> y la{" "}
            <Link href="/privacidad" className="font-medium text-brand underline">política de privacidad</Link>.
          </span>
        </label>
        <ErrorNote text={error} />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthFrame>
  );
}
