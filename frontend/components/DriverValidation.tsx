"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, QrCode, ScanLine, Ticket } from "lucide-react";
import { ErrorState } from "@/components/pasajero/ui";
import { act, api } from "@/lib/api";
import { CATEGORY_LABEL, FARES, type Category } from "@/lib/data";
import { useApp, type Bus } from "@/lib/store";

interface Verified {
  valid: boolean;
  reason?: string;
  name?: string;
  photo?: string;
  fareCategory?: Category;
  accreditationStatus?: string;
  codeMasked?: string;
}

type Detector = new (o: object) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Escaneo (cámara, si el navegador lo permite) o ingreso manual del QR temporal del pasajero. */
export function QrVerifier() {
  const [token, setToken] = useState("");
  const [res, setRes] = useState<Verified | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  async function verify(t: string) {
    setMsg(null);
    try {
      setRes(await api<Verified>("/credentials/verify", "POST", { token: t.trim() }));
    } catch (e) {
      setRes(null);
      setMsg((e as Error).message);
    }
  }

  useEffect(() => {
    if (!scanning) return;
    let stop = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        const D = (window as unknown as { BarcodeDetector: Detector }).BarcodeDetector;
        const det = new D({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current!.srcObject = stream;
        await video.current!.play();
        while (!stop) {
          const found = await det.detect(video.current!).catch(() => []);
          if (found[0]) {
            setToken(found[0].rawValue);
            setScanning(false);
            void verify(found[0].rawValue);
            return;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch {
        setMsg("No se pudo abrir la cámara. Pega el código manualmente.");
        setScanning(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window;

  return (
    <section className="psj-card flex flex-col gap-3 p-4" aria-labelledby="qrv">
      <h2 id="qrv" className="flex items-center gap-2 font-semibold">
        <QrCode size={18} />
        Verificar carnet QR
      </h2>
      {scanning && <video ref={video} className="aspect-video w-full rounded-lg bg-black" muted playsInline />}
      <div>
        <label htmlFor="qrt" className="psj-label">Código del pasajero</label>
        <input id="qrt" className="psj-input font-mono" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Pega o escanea el código" />
      </div>
      <div className="flex gap-2">
        <button className="psj-btn psj-btn-primary flex-1" disabled={!token.trim()} onClick={() => void verify(token)}>
          Verificar
        </button>
        {canScan && (
          <button className="psj-btn psj-btn-outline" onClick={() => setScanning((s) => !s)}>
            <ScanLine size={16} />
            {scanning ? "Detener" : "Escanear"}
          </button>
        )}
      </div>
      {msg && <ErrorState message={msg} />}
      {res && (
        <div role="status" className={`flex items-center gap-3 rounded-lg border p-3 ${res.valid ? "border-(--psj-green) bg-(--psj-green-soft)" : "border-(--psj-danger) bg-(--psj-danger-soft)"}`}>
          {res.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={res.photo} alt={`Fotografía de ${res.name}`} className="h-16 w-16 rounded-lg object-cover" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{res.valid ? "Credencial válida" : `Credencial no válida: ${res.reason ?? "rechazada"}`}</p>
            {res.name && <p>{res.name} · {res.codeMasked}</p>}
            {res.fareCategory && (
              <p>
                Tarifa {CATEGORY_LABEL[res.fareCategory]} · acreditación {res.accreditationStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Cobro en efectivo autorizado: el importe lo fija el servidor según la categoría declarada. */
export function CashPanel({ bus }: { bus: Bus }) {
  const { refresh } = useApp();
  const [category, setCategory] = useState<Category>("general");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [token, setToken] = useState("");

  async function charge() {
    const err = await act(`/micros/${bus.id}/cash`, "POST", { category, ...(category !== "general" ? { token: token.trim() } : {}) });
    if (!err) setToken("");
    setMsg(err);
    setOk(err ? null : `Cobro en efectivo registrado (Bs ${FARES[category].toFixed(2)}).`);
    if (!err) await refresh();
  }

  return (
    <section className="psj-card flex flex-col gap-3 p-4" aria-labelledby="cash">
      <h2 id="cash" className="flex items-center gap-2 font-semibold">
        <Banknote size={18} />
        Cobro en efectivo
      </h2>
      <p className="text-sm text-(--psj-muted-strong)">El importe no se puede modificar: lo calcula el sistema.</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className="psj-choice"
          >
            {CATEGORY_LABEL[c]}
            <span className="block text-xs font-normal text-(--psj-muted-strong)">Bs {FARES[c].toFixed(2)}</span>
          </button>
        ))}
      </div>
      {category !== "general" && (
        <div>
          <label htmlFor="ct" className="psj-label">Código QR del pasajero acreditado</label>
          <input id="ct" className="psj-input font-mono" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          <p className="mt-1 text-xs text-(--psj-muted-strong)">La tarifa preferencial exige la credencial vigente (no la uses antes en «Validar credencial»: el código es de un solo uso).</p>
        </div>
      )}
      {msg && <ErrorState message={msg} />}
      {ok && <p role="status" className="text-sm text-(--psj-green)">{ok}</p>}
      <button className="psj-btn psj-btn-primary psj-btn-lg" onClick={charge} disabled={bus.occupancy >= bus.max}>
        Registrar cobro y subida
      </button>
    </section>
  );
}

/** Canje de pases temporales de trasbordo (sin segundo cobro). */
export function PassRedeem() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <section className="psj-card flex flex-col gap-3 p-4" aria-labelledby="pase">
      <h2 id="pase" className="flex items-center gap-2 font-semibold">
        <Ticket size={18} />
        Pase temporal de trasbordo
      </h2>
      <div>
        <label htmlFor="pc" className="psj-label">Código del pase (TMP-...)</label>
        <input id="pc" className="psj-input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      {msg && <ErrorState message={msg} />}
      {ok && <p role="status" className="text-sm text-(--psj-green)">Pase aceptado: el pasajero no paga de nuevo.</p>}
      <button
        className="psj-btn psj-btn-outline"
        disabled={!code.trim()}
        onClick={async () => {
          const err = await act("/passes/redeem", "POST", { code: code.trim().toUpperCase() });
          setMsg(err);
          setOk(!err);
          if (!err) setCode("");
        }}
      >
        Aceptar pase
      </button>
    </section>
  );
}
