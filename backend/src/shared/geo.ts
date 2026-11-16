import type { Position } from '../micros/models';

export function haversine(a: Position, b: Position): number {
  const radians = Math.PI / 180;
  const lat = (b[0] - a[0]) * radians;
  const lng = (b[1] - a[1]) * radians;
  const value =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a[0] * radians) *
      Math.cos(b[0] * radians) *
      Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, value))));
}

export function interpolate(waypoints: Position[], progress: number): Position {
  if (waypoints.length === 0) return [-17.7834, -63.1821];
  if (waypoints.length === 1) return [...waypoints[0]];
  const normalized = ((progress % 1) + 1) % 1;
  const fraction = normalized < 0.5 ? normalized * 2 : (1 - normalized) * 2;
  const lengths = waypoints.slice(1).map((point, index) =>
    haversine(waypoints[index], point),
  );
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * fraction;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (remaining <= length || index === lengths.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, remaining / length);
      const start = waypoints[index];
      const end = waypoints[index + 1];
      return [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ];
    }
    remaining -= length;
  }
  return [...waypoints[waypoints.length - 1]];
}
