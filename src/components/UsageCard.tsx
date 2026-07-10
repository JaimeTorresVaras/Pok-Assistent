"use client";

import { PixelSprite } from "@/components/PixelSprite";
import type { ThreatMon } from "@/core/domain/model";

interface Props {
  threat: ThreatMon;
}

/** Ficha de uso de un Pokémon concreto como respuesta del chat. */
export function UsageCard({ threat: t }: Props) {
  const nature = t.spreads[0]?.nature;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <PixelSprite pokemon={t.pokemon} size={56} className="shrink-0" />
        <div>
          <h3 className="text-base font-bold">{t.pokemon}</h3>
          <p className="font-mono text-xs text-muted tabular-nums">
            {t.usagePct.toFixed(1)}% de uso
            {t.winratePct != null ? ` · ${t.winratePct.toFixed(1)}% winrate` : ""}
            {nature ? ` · ${nature}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <p className="font-pixel mb-1 text-[9px] text-muted uppercase">Movimientos</p>
          <ul className="space-y-0.5">
            {t.moves.slice(0, 4).map((m) => (
              <li key={m.name} className="flex justify-between gap-2">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {m.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-pixel mb-1 text-[9px] text-muted uppercase">Ítems / Habilidad</p>
          <ul className="space-y-0.5">
            {t.items.slice(0, 2).map((m) => (
              <li key={m.name} className="flex justify-between gap-2">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {m.pct.toFixed(0)}%
                </span>
              </li>
            ))}
            {t.abilities.slice(0, 1).map((m) => (
              <li key={m.name} className="flex justify-between gap-2">
                <span className="truncate italic">{m.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {m.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
