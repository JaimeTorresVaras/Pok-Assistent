"use client";

import { PixelSprite } from "@/components/PixelSprite";
import type { ThreatMon } from "@/core/domain/model";

interface Props {
  threats: ThreatMon[];
}

/** Top del meta como respuesta del chat: ranking con sprites y barras de uso. */
export function MetaTopCard({ threats }: Props) {
  const top = threats.slice(0, 10);
  const maxPct = top[0]?.usagePct ?? 1;

  return (
    <div>
      <h3 className="font-pixel mb-3 text-[10px] uppercase">Top 10 del meta</h3>
      <ol className="space-y-1.5">
        {top.map((t, i) => (
          <li key={t.pokemon} className="flex items-center gap-2">
            <span className="font-pixel w-6 shrink-0 text-right text-[9px] text-muted">
              {i + 1}
            </span>
            <PixelSprite pokemon={t.pokemon} size={36} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{t.pokemon}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {t.usagePct.toFixed(1)}%
                  {t.winratePct != null ? ` · WR ${t.winratePct.toFixed(0)}%` : ""}
                </span>
              </div>
              <div className="game-inset h-2.5 overflow-hidden border">
                <div
                  className="h-full bg-poke-red"
                  style={{ width: `${(t.usagePct / maxPct) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Datos reales de torneos (Pikalytics/Limitless), ponderados por recencia y recalculados con
        cada ingesta.
      </p>
    </div>
  );
}
