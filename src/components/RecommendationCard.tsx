"use client";

import { useState } from "react";

import { EvBar } from "@/components/EvBar";
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
    <article className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{rec.pokemon}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {recommended.nature}
            {recommended.item ? ` · ${recommended.item}` : ""}
            {recommended.ability ? ` · ${recommended.ability}` : ""}
            {recommended.teraType ? ` · Tera ${recommended.teraType}` : ""}
          </p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-emerald-500 dark:border-neutral-700"
          title="Copiar en formato Showdown"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </header>

      {/* EVs */}
      <div className="space-y-1.5">
        {STAT_KEYS.filter((s) => (recommended.evs[s] ?? 0) > 0).map((s) => (
          <EvBar key={s} stat={s} value={recommended.evs[s] ?? 0} />
        ))}
        <p className="text-right text-[11px] text-neutral-500">
          {totalEvs(recommended.evs)}/508 EVs
        </p>
      </div>

      {/* Movimientos */}
      {recommended.moves.length > 0 ? (
        <ul className="grid grid-cols-2 gap-1.5 text-sm">
          {recommended.moves.map((move) => (
            <li key={move} className="rounded-lg bg-neutral-100 px-2.5 py-1.5 dark:bg-neutral-900">
              {move}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500 italic">
          Elige 4 movimientos de su movepool (sin datos del meta todavía).
        </p>
      )}

      {rec.metaMoves.length > 0 && (
        <p className="text-xs text-neutral-500">
          Más usados: {rec.metaMoves.slice(0, 4).join(" · ")}
        </p>
      )}

      {/* Benchmarks verificados */}
      {rec.benchmarks.length > 0 && (
        <ul className="space-y-1 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
          {rec.benchmarks.map((b) => (
            <li key={b.goal} className="flex items-start gap-2">
              <span aria-hidden className={b.verified ? "text-emerald-500" : "text-red-500"}>
                {b.verified ? "✓" : "✗"}
              </span>
              <span>
                {b.goal}
                {b.target && <span className="text-neutral-500"> — {b.target}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Por qué (plegable) */}
      <details className="text-sm text-neutral-600 dark:text-neutral-400">
        <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
          ¿Por qué?
        </summary>
        <p className="mt-1.5">{rec.reasoning}</p>
      </details>
    </article>
  );
}
