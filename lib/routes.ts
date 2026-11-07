import type { LatLng, LineDef } from "./data";

// OSRM publico (gratuito, sin clave) sobre datos de OpenStreetMap.
const OSRM = "https://router.project-osrm.org/route/v1/driving";

export function roundTrip(path: LatLng[]): LatLng[] {
  return [...path, ...path.slice(0, -1).reverse()];
}

export async function fetchLinePath(line: LineDef): Promise<LatLng[] | null> {
  const key = `rutabol-route-${line.id}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as LatLng[];
  } catch {}
  try {
    const coords = line.waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const res = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(10000),
    });
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
