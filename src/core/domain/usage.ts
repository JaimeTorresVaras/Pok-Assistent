import { formatShowdownEvs } from "./evs";
import type { ThreatMon, TournamentDoc, UsageEntry, UsageStats } from "./model";

/**
 * Recalcula el usage agregado a partir de los documentos de torneo, con
 * DECAIMIENTO TEMPORAL: los torneos recientes pesan más que los viejos
 * (peso = 0.5^(edadEnDías/vidaMedia)). (PLAN.md §6 paso 4.)
 *
 * Función pura: `now` se inyecta para que sea determinista y testeable.
 */
export interface UsageOptions {
  /** Fecha "hoy" en ISO (YYYY-MM-DD). */
  now: string;
  /** Vida media del peso en días (por defecto 14). */
  halfLifeDays?: number;
}

const MS_PER_DAY = 86_400_000;

export function computeUsageStats(docs: TournamentDoc[], opts: UsageOptions): UsageStats[] {
  if (docs.length === 0) return [];
  const halfLife = opts.halfLifeDays ?? 14;
  const nowMs = Date.parse(opts.now);

  const weightOf = (doc: TournamentDoc): number => {
    const ageDays = Math.max(0, (nowMs - Date.parse(doc.date)) / MS_PER_DAY);
    return Math.pow(0.5, ageDays / halfLife);
  };

  // Un "equipo" = torneo + jugador. Su peso cuenta una sola vez para el total.
  const teamKey = (doc: TournamentDoc) => `${doc.tournament}#${doc.player}`;
  const teamWeights = new Map<string, number>();
  for (const doc of docs) {
    if (!teamWeights.has(teamKey(doc))) teamWeights.set(teamKey(doc), weightOf(doc));
  }
  const totalTeamWeight = [...teamWeights.values()].reduce((a, b) => a + b, 0);

  // Agrupar docs por Pokémon.
  const byMon = new Map<string, TournamentDoc[]>();
  for (const doc of docs) {
    const list = byMon.get(doc.pokemon) ?? [];
    list.push(doc);
    byMon.set(doc.pokemon, list);
  }

  const stats: UsageStats[] = [];
  for (const [pokemon, monDocs] of byMon) {
    const regulation = monDocs[0].regulation;
    const monWeight = monDocs.reduce((sum, d) => sum + weightOf(d), 0);

    // % de uso: peso de los equipos que lo llevan sobre el peso total.
    const monTeams = new Set(monDocs.map(teamKey));
    const monTeamWeight = [...monTeams].reduce((sum, k) => sum + (teamWeights.get(k) ?? 0), 0);
    const usagePct = round1((monTeamWeight / totalTeamWeight) * 100);

    // Winrate ponderado (solo docs con récord).
    let winW = 0;
    let gamesW = 0;
    for (const d of monDocs) {
      if (d.wins != null && d.losses != null) {
        const w = weightOf(d);
        winW += w * d.wins;
        gamesW += w * (d.wins + d.losses);
      }
    }
    const winratePct = gamesW > 0 ? round1((winW / gamesW) * 100) : undefined;

    stats.push({
      regulation,
      pokemon,
      usagePct,
      winratePct,
      moves: weightedShare(
        monDocs.flatMap((d) => d.set.moves.map((m) => ({ name: m, weight: weightOf(d) }))),
        monWeight,
      ),
      items: weightedShare(
        monDocs.filter((d) => d.set.item).map((d) => ({ name: d.set.item, weight: weightOf(d) })),
        monWeight,
      ),
      abilities: weightedShare(
        monDocs
          .filter((d) => d.set.ability)
          .map((d) => ({ name: d.set.ability, weight: weightOf(d) })),
        monWeight,
      ),
      spreads: weightedShare(
        monDocs.map((d) => ({
          // Sin EVs públicos en Champions, el spread agrega al menos la naturaleza real.
          name: `${d.set.nature}|${formatShowdownEvs(d.set.evs)}`,
          weight: weightOf(d),
        })),
        monWeight,
      ).map((s) => {
        const [nature, evs] = s.name.split("|");
        return { nature: nature as ThreatMon["spreads"][number]["nature"], evs, pct: s.pct };
      }),
      teraTypes: weightedShare(
        monDocs
          .filter((d) => d.set.teraType)
          .map((d) => ({ name: d.set.teraType, weight: weightOf(d) })),
        monWeight,
      ),
      sampleSize: monDocs.length,
    });
  }

  return stats.sort((a, b) => b.usagePct - a.usagePct);
}

/** Agrega {name, weight} en entradas {name, pct} sobre un peso total, ordenadas. */
function weightedShare(entries: { name: string; weight: number }[], total: number): UsageEntry[] {
  if (total <= 0) return [];
  const acc = new Map<string, number>();
  for (const e of entries) acc.set(e.name, (acc.get(e.name) ?? 0) + e.weight);
  return [...acc.entries()]
    .map(([name, w]) => ({ name, pct: round1((w / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
