"use client";

import { useState } from "react";

import { EvBar } from "@/components/EvBar";
import { PixelSprite } from "@/components/PixelSprite";
import { recommendationToShowdown } from "@/components/showdown";
import { totalEvs } from "@/core/domain/evs";
import type { Recommendation } from "@/core/domain/model";
import { STAT_KEYS } from "@/core/domain/model";

interface Props {
  recommendation: Recommendation;
}

/** Tarjeta por Pokémon: set recomendado + benchmarks verificados. (PLAN.md §7.) */
export function RecommendationCard({ recommendation: rec }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(recommendationToShowdown(rec));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const { recommended } = rec;

  return (
    <article className="game-box flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PixelSprite pokemon={rec.pokemon} size={52} className="shrink-0" />
          <div>
            <h3 className="text-base font-bold">{rec.pokemon}</h3>
            <p className="text-xs text-muted">
              {recommended.nature}
              {recommended.item ? ` · ${recommended.item}` : ""}
              {recommended.ability ? ` · ${recommended.ability}` : ""}
              {recommended.teraType ? ` · Tera ${recommended.teraType}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={copy}
          className="game-btn font-pixel shrink-0 bg-panel-2 px-2 py-1.5 text-[8px] uppercase"
          title="Copiar en formato Showdown"
        >
          {copied ? "¡Listo!" : "Copiar"}
        </button>
      </header>

      {/* EVs */}
      <div className="space-y-1.5">
        {STAT_KEYS.filter((s) => (recommended.evs[s] ?? 0) > 0).map((s) => (
          <EvBar key={s} stat={s} value={recommended.evs[s] ?? 0} />
        ))}
        <p className="text-right text-[11px] text-muted">{totalEvs(recommended.evs)}/508 EVs</p>
      </div>

      {/* Movimientos */}
      {recommended.moves.length > 0 ? (
        <ul className="grid grid-cols-2 gap-1.5 text-sm">
          {recommended.moves.map((move) => (
            <li key={move} className="game-inset px-2.5 py-1.5">
              {move}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted italic">
          Elige 4 movimientos de su movepool (sin datos del meta todavía).
        </p>
      )}

      {rec.metaMoves.length > 0 && (
        <p className="text-xs text-muted">Más usados: {rec.metaMoves.slice(0, 4).join(" · ")}</p>
      )}

      {/* Benchmarks verificados */}
      {rec.benchmarks.length > 0 && (
        <ul className="space-y-1 border-t-2 border-dashed border-muted/40 pt-3 text-sm">
          {rec.benchmarks.map((b) => (
            <li key={b.goal} className="flex items-start gap-2">
              <span
                aria-hidden
                className={`font-pixel text-[9px] ${b.verified ? "text-poke-green" : "text-poke-red"}`}
              >
                {b.verified ? "✓" : "✗"}
              </span>
              <span>
                {b.goal}
                {b.target && <span className="text-muted"> — {b.target}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Por qué (plegable) */}
      <details className="text-sm text-muted">
        <summary className="font-pixel cursor-pointer text-[9px] text-ink uppercase">
          ¿Por qué?
        </summary>
        <p className="mt-1.5">{rec.reasoning}</p>
      </details>
    </article>
  );
}
