"use client";

import { useMemo, useState } from "react";

import { RecommendationCard } from "@/components/RecommendationCard";
import { ThreatsPanel } from "@/components/ThreatsPanel";
import { recommendationToShowdown } from "@/components/showdown";
import type { Recommendation, ThreatMon } from "@/core/domain/model";

const MAX_TEAM = 6;

interface Props {
  regulation: string;
  legalMons: string[];
  threats: ThreatMon[];
}

/**
 * Team Builder (frontera de cliente): selección de equipo + llamada a
 * /api/recommend + render de las tarjetas. (PLAN.md §7.)
 */
export function TeamBuilder({ regulation, legalMons, threats }: Props) {
  const [team, setTeam] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === "" ? legalMons : legalMons.filter((m) => m.toLowerCase().includes(q));
  }, [legalMons, query]);

  function toggle(mon: string) {
    setTeam((current) => {
      if (current.includes(mon)) return current.filter((m) => m !== mon);
      if (current.length >= MAX_TEAM) return current;
      return [...current, mon];
    });
  }

  async function recommend() {
    setLoading(true);
    setError(null);
    setRecommendations(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, regulation }),
      });
      const data = (await res.json()) as { recommendations?: Recommendation[]; error?: string };
      if (!res.ok || !data.recommendations) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!recommendations) return;
    await navigator.clipboard.writeText(recommendations.map(recommendationToShowdown).join("\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section>
        {/* Selección del equipo */}
        <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
              Tu equipo ({team.length}/{MAX_TEAM})
            </h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar Pokémon legal…"
              className="w-48 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700"
            />
          </div>

          {team.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {team.map((mon) => (
                <button
                  key={mon}
                  onClick={() => toggle(mon)}
                  className="group flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
                  title="Quitar del equipo"
                >
                  {mon}
                  <span aria-hidden className="text-emerald-200 group-hover:text-white">
                    ✕
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {filtered.map((mon) => {
              const selected = team.includes(mon);
              const full = !selected && team.length >= MAX_TEAM;
              return (
                <button
                  key={mon}
                  onClick={() => toggle(mon)}
                  disabled={full}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selected
                      ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                      : "border-neutral-300 hover:border-emerald-500 disabled:opacity-40 dark:border-neutral-700"
                  }`}
                >
                  {mon}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-neutral-500">Sin resultados para “{query}”.</p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={recommend}
              disabled={team.length === 0 || loading}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Calculando…" : "Obtener recomendaciones"}
            </button>
            {recommendations && (
              <button
                onClick={copyAll}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-emerald-500 dark:border-neutral-700"
              >
                {copiedAll ? "¡Copiado!" : "Copiar equipo (Showdown)"}
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Recomendaciones */}
        {recommendations && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.pokemon} recommendation={rec} />
            ))}
          </div>
        )}
      </section>

      <ThreatsPanel threats={threats} />
    </div>
  );
}
