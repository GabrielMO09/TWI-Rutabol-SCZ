export const bs = (n: number) => `Bs ${n.toFixed(2)}`;

/** Muestra solo los últimos 4 caracteres del número de tarjeta. */
export const maskCard = (card: string) => `•••• •••• •••• ${card.replace(/\W/g, "").slice(-4)}`;

export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const time = (ms: number) => new Date(ms).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Hoy", "Ayer" o la fecha larga, para agrupar listas por día. */
export function dayLabel(ms: number) {
  const d = new Date(ms);
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return "Hoy";
  now.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return "Ayer";
  return d.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
}
