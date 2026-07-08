import { parseShowdownEvs } from "@/core/domain/evs";
import type {
  Benchmark,
  CalcMon,
  Recommendation,
  Regulation,
  SpeciesInfo,
  ThreatMon,
} from "@/core/domain/model";
import type { DamageCalcPort } from "@/core/ports/damageCalcPort";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";
import type { PokedexPort } from "@/core/ports/pokedexPort";

import type { LegalityService } from "./legality";

/** El equipo contiene Pokémon no permitidos en la regulación. */
export class IllegalTeamError extends Error {
  constructor(
    readonly illegal: string[],
    regulation: Regulation,
  ) {
    super(`Pokémon no legales en la regulación ${regulation}: ${illegal.join(", ")}`);
    this.name = "IllegalTeamError";
  }
}

export interface RecommendTeamDeps {
  pokedex: PokedexPort;
  meta: MetaUsagePort;
  calc: DamageCalcPort;
  legality: LegalityService;
}

/** Cuántas amenazas top se usan para calcular benchmarks por Pokémon. */
const BENCHMARK_THREATS = 3;

/**
 * Caso de uso: recomendaciones por Pokémon para un equipo de hasta 6.
 *
 * Versión determinista (v1): usa el set más frecuente del meta cuando hay
 * datos de uso, o un spread genérico si no los hay, y calcula benchmarks
 * REALES (verificados por el motor de daño) contra las amenazas top.
 * En la Fase 6, el AdvisorPort (Claude) priorizará objetivos y explicará;
 * los números seguirán saliendo de aquí.
 */
export class RecommendTeamUseCase {
  constructor(private readonly deps: RecommendTeamDeps) {}

  async exec(team: string[], regulation: Regulation): Promise<Recommendation[]> {
    const illegal = team.filter((mon) => !this.deps.legality.isLegal(mon, regulation));
    if (illegal.length > 0) throw new IllegalTeamError(illegal, regulation);

    const threats = this.deps.meta.topThreats(regulation, 10);
    return Promise.all(team.map((mon) => this.recommendOne(mon, regulation, threats)));
  }

  private async recommendOne(
    pokemon: string,
    regulation: Regulation,
    threats: ThreatMon[],
  ): Promise<Recommendation> {
    // Legalidad ya validada => la especie existe.
    const species = this.deps.pokedex.getSpecies(pokemon)!;
    const usage = this.deps.meta.usage(species.name, regulation);

    const partial = usage ? fromUsage(usage) : fallbackSet(species, regulation);

    const rivals = threats.filter((t) => t.pokemon !== species.name).slice(0, BENCHMARK_THREATS);
    const benchmarks = this.computeBenchmarks(species.name, partial.recommended, rivals);

    return {
      pokemon: species.name,
      recommended: partial.recommended,
      reasoning: partial.reasoning,
      benchmarks,
      metaMoves: partial.metaMoves,
    };
  }

  /**
   * Benchmarks reales contra las amenazas top: cuánto recibimos de su
   * movimiento más usado y cuánto les hacemos con el nuestro. Cada número
   * sale del DamageCalcPort — nunca se inventa.
   */
  private computeBenchmarks(
    pokemon: string,
    rec: Recommendation["recommended"],
    threats: ThreatMon[],
  ): Benchmark[] {
    const benchmarks: Benchmark[] = [];
    const self: CalcMon = {
      pokemon,
      level: 50,
      nature: rec.nature,
      evs: rec.evs,
      item: rec.item || undefined,
      ability: rec.ability,
    };

    for (const threat of threats) {
      const rival = threatCalcMon(threat);
      if (!rival) continue;

      // Defensa: primer movimiento del rival que haga daño (>0).
      const incoming = this.firstDamaging(
        rival,
        self,
        threat.moves.map((m) => m.name),
      );
      if (incoming) {
        benchmarks.push({
          goal: `Sobrevive ${incoming.move} de ${threat.pokemon}`,
          target: `recibe ${incoming.result.minPct}–${incoming.result.maxPct}%`,
          verified: incoming.result.maxPct < 100,
        });
      }

      // Ofensa: primer movimiento nuestro que haga daño (>0).
      const outgoing = this.firstDamaging(self, rival, rec.moves);
      if (outgoing) {
        benchmarks.push({
          goal: `2HKO a ${threat.pokemon} con ${outgoing.move}`,
          target: `hace ${outgoing.result.minPct}–${outgoing.result.maxPct}%${
            outgoing.result.koChance ? ` (${outgoing.result.koChance})` : ""
          }`,
          verified: outgoing.result.minPct >= 50,
        });
      }
    }
    return benchmarks;
  }

  /** Primer movimiento de la lista que hace daño real; null si ninguno. */
  private firstDamaging(attacker: CalcMon, defender: CalcMon, moves: string[]) {
    for (const move of moves) {
      try {
        const result = this.deps.calc.calcDamage(attacker, defender, move);
        if (result.maxDamage > 0) return { move, result };
      } catch {
        // Movimiento desconocido para el motor: lo saltamos.
      }
    }
    return null;
  }
}

/** Recomendación a partir de datos reales de uso del meta. */
function fromUsage(usage: ThreatMon): Omit<Recommendation, "pokemon" | "benchmarks"> {
  const spread = usage.spreads[0];
  return {
    recommended: {
      nature: spread?.nature ?? "Serious",
      item: usage.items[0]?.name ?? "",
      ability: usage.abilities[0]?.name,
      teraType: usage.teraTypes[0]?.name,
      evs: spread ? parseShowdownEvs(spread.evs) : { hp: 4, atk: 252, spe: 252 },
      moves: usage.moves.slice(0, 4).map((m) => m.name),
    },
    reasoning:
      `Set más usado del meta (${usage.usagePct}% de uso): spread "${spread?.evs}" ` +
      `(${spread?.pct}% de los ${usage.pokemon}), con el ítem y los movimientos de mayor ` +
      `frecuencia real. El razonamiento fino (objetivos priorizados por IA) llega en la Fase 6.`,
    metaMoves: usage.moves.map((m) => `${m.name} ${m.pct}%`),
  };
}

/** Spread genérico cuando no hay datos de uso (marcado como provisional). */
function fallbackSet(
  species: SpeciesInfo,
  regulation: Regulation,
): Omit<Recommendation, "pokemon" | "benchmarks"> {
  const physical = species.baseStats.atk >= species.baseStats.spa;
  const attackStat = physical ? ("atk" as const) : ("spa" as const);
  return {
    recommended: {
      nature: physical ? "Adamant" : "Modest",
      item: "",
      ability: species.abilities[0],
      teraType: species.types[0],
      evs: { hp: 4, [attackStat]: 252, spe: 252 },
      moves: [],
    },
    reasoning:
      `Sin datos de uso en ${regulation} para ${species.name}: spread genérico ofensivo ` +
      `(252 ${physical ? "Atk" : "SpA"} / 252 Spe) como punto de partida. Elige 4 movimientos ` +
      `de su movepool; los datos reales del meta y la IA (Fase 6) refinarán esta recomendación.`,
    metaMoves: [],
  };
}

/** CalcMon de una amenaza a partir de su spread más usado; null si no hay. */
function threatCalcMon(threat: ThreatMon): CalcMon | null {
  const spread = threat.spreads[0];
  if (!spread) return null;
  return {
    pokemon: threat.pokemon,
    level: 50,
    nature: spread.nature,
    evs: parseShowdownEvs(spread.evs),
    item: threat.items[0]?.name,
    ability: threat.abilities[0]?.name,
  };
}
