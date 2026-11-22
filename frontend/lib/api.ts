"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      credentials: "include", // la sesion viaja en la cookie HttpOnly
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message;
    throw new ApiError(Array.isArray(m) ? m.join(" ") : (m ?? "Error del servidor."), res.status);
  }
  return data as T;
}

/** Ejecuta un comando y devuelve el mensaje de error, o null si salió bien. */
export async function act(path: string, method = "POST", body?: unknown): Promise<string | null> {
  try {
    await api(path, method, body);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** Descarga un archivo autenticado (p. ej. CSV de reportes). */
export async function download(path: string, filename: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}${path}`, { credentials: "include" });
    if (!res.ok) return "No se pudo generar el archivo.";
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return null;
  } catch {
    return "No se pudo conectar con el servidor.";
  }
}

export const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Carga datos de la API y los refresca cada `everyMs` (0 = una sola vez).
 * `path` en null pausa la carga. `reload()` fuerza la recarga.
 */
export function useFetch<T>(path: string | null, everyMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    if (path === null) return;
    try {
      const d = await api<T>(path);
      if (!alive.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    void reload();
    const id = everyMs > 0 ? setInterval(() => void reload(), everyMs) : undefined;
    return () => {
      alive.current = false;
      if (id) clearInterval(id);
    };
  }, [reload, everyMs]);

  return { data, error, loading, reload };
}
