import { MAX_EVS_PER_STAT } from "@/core/domain/evs";
import type { StatKey } from "@/core/domain/model";

/** Etiqueta y color por stat (colores clásicos de las stats). */
const STAT_META: Record<StatKey, { label: string; color: string }> = {
  hp: { label: "HP", color: "#e05a47" },
  atk: { label: "Atq", color: "#ef8f43" },
  def: { label: "Def", color: "#e8c23a" },
  spa: { label: "At.Esp", color: "#5aa4d8" },
  spd: { label: "Df.Esp", color: "#6fbf73" },
  spe: { label: "Vel", color: "#d873a8" },
};

interface Props {
  stat: StatKey;
  value: number;
}

/** Barra horizontal de EVs de un stat (0–252), estilo medidor de juego. */
export function EvBar({ stat, value }: Props) {
  const { label, color } = STAT_META[stat];
  const pct = Math.min(100, (value / MAX_EVS_PER_STAT) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-pixel w-14 shrink-0 text-[8px] text-muted uppercase">{label}</span>
      <div className="game-inset h-3 flex-1 overflow-hidden border">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono tabular-nums">{value}</span>
    </div>
  );
}
