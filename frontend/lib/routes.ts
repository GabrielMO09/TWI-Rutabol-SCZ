import type { LatLng, LineDef } from "./data";

// OSRM público sobre datos de OpenStreetMap.
const OSRM = "https://router.project-osrm.org/route/v1/driving";

export interface Stop {
  id: string;
  line: string;
  name: string;
  reference: string;
  lat: number;
  lng: number;
  order: number;
  active: boolean;
}

export function roundTrip(path: LatLng[]): LatLng[] {
  return [...path, ...path.slice(0, -1).reverse()];
}

export function linePathKey(line: LineDef): string {
  return `rutabol-route-v2-${JSON.stringify([line.id, line.waypoints])}`;
}

export async function fetchLinePath(line: LineDef): Promise<LatLng[] | null> {
  if (line.waypoints.length < 2) return null;
  const key = linePathKey(line);
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as LatLng[];
  } catch {}
  try {
    const coords = line.waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const res = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok") return null;
    const path = roundTrip(
      (data.routes[0].geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as LatLng,
      ),
    );
    try {
      sessionStorage.setItem(key, JSON.stringify(path));
    } catch {}
    return path;
  } catch {
    return null;
  }
}
