export type LatLng = [number, number];
export type Category = "escolar" | "universitario" | "general";

export const PLAZA: LatLng = [-17.7834, -63.1821];
export const RADIUS_KM = 5;
export const TICK_MS = 4000;

// Tarifas referenciales en bolivianos; se reemplazan por las oficiales de cada línea.
export const FARES: Record<Category, number> = {
  escolar: 1.0,
  universitario: 1.5,
  general: 2.5,
};
export const CATEGORY_LABEL: Record<Category, string> = {
  escolar: "Escolar",
  universitario: "Universitario",
  general: "General",
};

export interface LineDef {
  id: string;
  name: string;
  waypoints: LatLng[];
}

export const LINES: LineDef[] = [
  {
    id: "17",
    name: "Línea 17 - Norte",
    waypoints: [PLAZA, [-17.77, -63.179], [-17.756, -63.176], [-17.742, -63.173]],
  },
  {
    id: "44",
    name: "Línea 44 - Sur",
    waypoints: [PLAZA, [-17.799, -63.18], [-17.815, -63.176], [-17.831, -63.172]],
  },
  {
    id: "11",
    name: "Línea 11 - Este",
    waypoints: [PLAZA, [-17.785, -63.162], [-17.788, -63.143], [-17.79, -63.126]],
  },
];

export const FLEET = [
  { line: "17", internal: "012", max: 25, occ: 7, progress: 0.05 },
  { line: "17", internal: "045", max: 25, occ: 12, progress: 0.3 },
  { line: "17", internal: "078", max: 20, occ: 17, progress: 0.55 },
  { line: "17", internal: "103", max: 25, occ: 3, progress: 0.8 },
  { line: "44", internal: "021", max: 25, occ: 22, progress: 0.1 },
  { line: "44", internal: "057", max: 22, occ: 9, progress: 0.4 },
  { line: "44", internal: "090", max: 25, occ: 25, progress: 0.7 },
  { line: "11", internal: "008", max: 25, occ: 14, progress: 0.2 },
  { line: "11", internal: "033", max: 18, occ: 6, progress: 0.5 },
  { line: "11", internal: "064", max: 25, occ: 19, progress: 0.65 },
  { line: "11", internal: "099", max: 25, occ: 2, progress: 0.9 },
];

// Asignaciones otorgadas por la administracion (RF-04).
export const DRIVERS = [
  { line: "17", internal: "045", pin: "1234", name: "Carlos Mamani" },
  { line: "44", internal: "057", pin: "1234", name: "Raúl Justiniano" },
  { line: "11", internal: "033", pin: "1234", name: "José Taborga" },
];

export const DEMO_STUDENT = {
  id: "estudiante@upds.edu.bo",
  password: "123456",
  name: "Estudiante de Prueba",
};

export type OccState = "disponible" | "moderado" | "casi-lleno" | "lleno";
export const OCC_LABEL: Record<OccState, string> = {
  disponible: "Disponible",
  moderado: "Moderado",
  "casi-lleno": "Casi lleno",
  lleno: "Lleno",
};

export function occState(occ: number, max: number): OccState {
  if (occ >= max) return "lleno";
  const r = occ / max;
  if (r >= 0.85) return "casi-lleno";
  if (r >= 0.6) return "moderado";
  return "disponible";
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
