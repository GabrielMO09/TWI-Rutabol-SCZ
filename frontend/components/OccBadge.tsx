import { OCC_LABEL, occState, type OccState } from "@/lib/data";

const STYLE: Record<OccState, string> = {
  disponible: "bg-green-100 text-green-800",
  moderado: "bg-lime-100 text-lime-800",
  "casi-lleno": "bg-amber-100 text-amber-800",
  lleno: "bg-red-100 text-red-800",
};

export default function OccBadge({ occupancy, max }: { occupancy: number; max: number }) {
  const s = occState(occupancy, max);
  return <span className={`chip ${STYLE[s]}`}>{OCC_LABEL[s]}</span>;
}
