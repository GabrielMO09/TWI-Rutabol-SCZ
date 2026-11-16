"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/data";
import { useApp } from "@/lib/store";

const WINDOW_S = 30;

function token(seed: string, slot: number) {
  let h = 2166136261;
  for (const c of `${seed}:${slot}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

export default function Carnet() {
  const { profile } = useApp();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!profile) return null;
  const slot = now ? Math.floor(now / 1000 / WINDOW_S) : 0;
  const left = now ? WINDOW_S - (Math.floor(now / 1000) % WINDOW_S) : WINDOW_S;
  const category = profile.category ?? "general";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      <h1 className="text-lg font-semibold">Carnet digital</h1>
      <article className="card overflow-hidden">
        <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
          <span className="text-sm font-semibold tracking-wide">RUTABOL-SCZ</span>
          <span className="chip bg-white/20 text-white">{CATEGORY_LABEL[category]}</span>
        </div>
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl border border-line bg-soft text-muted">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt={`Fotografía de ${profile.name}`} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={72} />
            )}
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">{profile.name}</p>
            <p className="break-all text-sm text-muted">{profile.code}</p>
          </div>
        </div>
        <div className="border-t border-line bg-soft p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-brand-dark">
              <ShieldCheck size={16} />
              Código antifraude
            </span>
            <span className="font-mono text-2xl font-semibold tracking-widest">
              {now ? token(profile.code ?? profile.name, slot) : "------"}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-brand transition-all" style={{ width: `${(left / WINDOW_S) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Cambia cada {WINDOW_S} s. Una captura de pantalla no sirve para abordar.</p>
        </div>
      </article>
    </div>
  );
}
