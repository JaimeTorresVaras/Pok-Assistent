import { MAX_EVS_PER_STAT } from "@/core/domain/evs";
import type { StatKey } from "@/core/domain/model";

/** Etiqueta y color por stat (colores clásicos de las stats). */
const STAT_META: Record<StatKey, { label: string; color: string }> = {
  hp: { label: "HP", color: "bg-red-400" },
  atk: { label: "Atq", color: "bg-orange-400" },
  def: { label: "Def", color: "bg-yellow-400" },
  spa: { label: "At. Esp", color: "bg-sky-400" },
  spd: { label: "Def. Esp", color: "bg-emerald-400" },
  spe: { label: "Vel", color: "bg-pink-400" },
};

interface Props {
  stat: StatKey;
  value: number;
}

/** Barra horizontal de EVs de un stat (0–252). */
export function EvBar({ stat, value }: Props) {
  const { label, color } = STAT_META[stat];
  const pct = Math.min(100, (value / MAX_EVS_PER_STAT) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-neutral-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono tabular-nums">{value}</span>
    </div>
  );
}
