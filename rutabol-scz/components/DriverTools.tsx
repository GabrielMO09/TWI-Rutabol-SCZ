"use client";

import { useEffect, useRef, useState } from "react";
import { History, MapPinned, Power, Wrench } from "lucide-react";
import { ErrorNote } from "@/components/AuthFrame";
import { act } from "@/lib/api";
import { useApp, type Bus } from "@/lib/store";

/** Inicio y cierre de jornada, y envío de ubicación GPS mientras el chofer está en servicio. */
export function JornadaCard({ bus }: { bus: Bus }) {
  const { world, refresh } = useApp();
  const onDuty = world.jornada?.onDuty ?? bus.onDuty ?? false;
  const [gps, setGps] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!onDuty || !gps) return;
    if (!navigator.geolocation) return setMsg("Tu navegador no permite geolocalización.");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        // Un envío cada 8 s (RNF-02: 5 a 10 s) para cuidar batería y datos.
        if (Date.now() - lastSent.current < 8000) return;
        lastSent.current = Date.now();
        void act(`/micros/${bus.id}/location`, "POST", {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }).then((err) => {
          setMsg(err);
          if (!err) setLast(Date.now());
        });
      },
      () => setMsg("No se pudo obtener el GPS. Revisa los permisos del navegador."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [onDuty, gps, bus.id]);

  async function toggle() {
    const err = await act(onDuty ? "/jornada/end" : "/jornada/start");
    setMsg(err);
    if (!err) {
      if (onDuty) setGps(false);
      await refresh();
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="jor">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="jor" className="font-semibold">Jornada</h2>
          <p className="text-sm text-muted">
            Línea {bus.line} · Interno {bus.internal}{bus.plate ? ` · ${bus.plate}` : ""} ·{" "}
            <span className={onDuty ? "font-medium text-brand" : "font-medium text-warn"}>
              {onDuty ? "En servicio" : "Fuera de servicio"}
            </span>
          </p>
        </div>
        <button className={`btn ${onDuty ? "btn-outline border-danger text-danger" : "btn-primary"} h-12`} onClick={toggle}>
          <Power size={18} />
          {onDuty ? "Cerrar jornada" : "Iniciar jornada"}
        </button>
      </div>
      {onDuty && (
        <label className="flex items-center gap-3 rounded-lg bg-soft p-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--g600)]" checked={gps} onChange={(e) => setGps(e.target.checked)} />
          <span className="flex-1">
            <span className="flex items-center gap-1 font-medium">
              <MapPinned size={16} />
              Compartir mi ubicación GPS
            </span>
            <span className="block text-xs text-muted">
              {bus.source === "gps" ? "Los pasajeros ven tu posición real." : "Sin GPS, la posición del mapa es simulada."}
              {last ? ` Último envío: ${new Date(last).toLocaleTimeString("es-BO")}.` : ""}
            </span>
          </span>
        </label>
      )}
      {!onDuty && <p className="text-xs text-muted">Mientras no estés en servicio, tu unidad no aparece en el mapa público.</p>}
      <ErrorNote text={msg} />
    </section>
  );
}

/** Corrección justificada del conteo y bitácora de ascensos/descensos. */
export function OccupancyCorrection({ bus }: { bus: Bus }) {
  const { world, refresh } = useApp();
  const [value, setValue] = useState(String(bus.occupancy));
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return setMsg("El conteo debe ser un entero mayor o igual a 0.");
    if (reason.trim().length < 5) return setMsg("Escribe el motivo de la corrección (mínimo 5 caracteres).");
    if (!window.confirm(`¿Corregir el conteo de ${bus.occupancy} a ${n} pasajeros?`)) return;
    const err = await act(`/micros/${bus.id}/occupancy/correct`, "POST", { occupancy: n, reason });
    setMsg(err);
    setOk(!err);
    if (!err) {
      setReason("");
      await refresh();
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card flex flex-col gap-3 p-4" aria-labelledby="corr">
        <h2 id="corr" className="flex items-center gap-2 font-semibold">
          <Wrench size={18} />
          Corregir conteo de pasajeros
        </h2>
        <p className="text-sm text-muted">
          Usa esta opción si el conteo no coincide con las personas a bordo. Queda registrado con tu motivo.
        </p>
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div>
            <label htmlFor="cv" className="label">A bordo</label>
            <input id="cv" className="input" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="cr" className="label">Motivo</label>
            <input id="cr" className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
        </div>
        <ErrorNote text={msg} />
        {ok && <p role="status" className="text-sm text-brand">Conteo corregido.</p>}
        <button className="btn btn-outline self-start border-2 border-brand-dark">Registrar corrección</button>
      </form>

      <section className="card p-4" aria-labelledby="bit">
        <h2 id="bit" className="mb-2 flex items-center gap-2 font-semibold">
          <History size={18} />
          Últimos movimientos
        </h2>
        {world.occupancyEvents.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay movimientos en esta jornada.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {world.occupancyEvents.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="capitalize">
                  {ev.kind} · {ev.from} a {ev.to}
                  {ev.reason ? <span className="text-muted"> · {ev.reason}</span> : null}
                </span>
                <span className="text-xs text-muted">{new Date(ev.at).toLocaleTimeString("es-BO")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
