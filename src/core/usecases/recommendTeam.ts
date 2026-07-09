import { parseShowdownEvs } from "@/core/domain/evs";
import type {
  Benchmark,
  CalcMon,
  EVs,
  Nature,
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
 * Versión determinista: ítem/habilidad/movimientos salen de los datos REALES
 * de uso del meta cuando existen; el spread de EVs se deriva de las stats
 * base (las fuentes públicas de Champions aún no exponen spreads) y se marca
 * como tal. Los benchmarks se calculan SIEMPRE con el motor de daño.
 * En la Fase 6, el AdvisorPort (Claude) priorizará objetivos y explicará;
 * los números seguirán saliendo de aquí.
 */
export class RecommendTeamUseCase {
  constructor(private readonly deps: RecommendTeamDeps) {}

  async exec(team: string[], regulation: Regulation): Promise<Recommendation[]> {
    const illegal = team.filter((mon) => !this.deps.legality.isLegal(mon, regulation));
    if (illegal.length > 0) throw new IllegalTeamError(illegal, regulation);

    const threats = await this.deps.meta.topThreats(regulation, 10);
    return Promise.all(team.map((mon) => this.recommendOne(mon, regulation, threats)));
  }

  private async recommendOne(
    pokemon: string,
    regulation: Regulation,
    threats: ThreatMon[],
  ): Promise<Recommendation> {
    // Legalidad ya validada => la especie existe.
    const species = this.deps.pokedex.getSpecies(pokemon)!;
    const usage = await this.deps.meta.usage(species.name, regulation);

    const partial = usage ? fromUsage(species, usage) : fallbackSet(species, regulation);

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
   * sale del DamageCalcPort — nunca se inventa. (Mientras no haya spreads
   * públicos, los rivales se calculan con spread neutro sin EVs.)
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

  /**
   * Primer movimiento de la lista que hace daño real; null si ninguno.
   * (Los movimientos o especies que el motor no conozca —p. ej. megas
   * exclusivas de Champions— se saltan sin romper.)
   */
  private firstDamaging(attacker: CalcMon, defender: CalcMon, moves: string[]) {
    for (const move of moves) {
      try {
        const result = this.deps.calc.calcDamage(attacker, defender, move);
        if (result.maxDamage > 0) return { move, result };
      } catch {
        // Movimiento o especie desconocidos para el motor: lo saltamos.
      }
    }
    return null;
  }
}

/** Spread ofensivo derivado de las stats base (mientras no haya spreads reales). */
function derivedSpread(species: SpeciesInfo): { nature: Nature; evs: EVs; label: string } {
  const physical = species.baseStats.atk >= species.baseStats.spa;
  return {
    nature: physical ? "Adamant" : "Modest",
    evs: physical ? { hp: 4, atk: 252, spe: 252 } : { hp: 4, spa: 252, spe: 252 },
    label: physical
      ? "ofensivo físico (252 Atk / 252 Spe)"
      : "ofensivo especial (252 SpA / 252 Spe)",
  };
}

/** Recomendación a partir de datos reales de uso del meta. */
function fromUsage(
  species: SpeciesInfo,
  usage: ThreatMon,
): Omit<Recommendation, "pokemon" | "benchmarks"> {
  const spread = usage.spreads[0];
  const derived = derivedSpread(species);
  const winrate = usage.winratePct != null ? ` y ${usage.winratePct}% de winrate` : "";
  // Champions no publica EVs: los spreads de torneos traen naturaleza real
  // pero evs "". La naturaleza se usa siempre; los EVs solo si son reales.
  const realEvs = spread?.evs ? parseShowdownEvs(spread.evs) : null;

  return {
    recommended: {
      nature: spread?.nature ?? derived.nature,
      item: usage.items[0]?.name ?? "",
      ability: usage.abilities[0]?.name ?? species.abilities[0],
      teraType: usage.teraTypes[0]?.name,
      evs: realEvs ?? derived.evs,
      moves: usage.moves.slice(0, 4).map((m) => m.name),
    },
    reasoning: realEvs
      ? `Set más usado del meta (${usage.usagePct}% de uso${winrate}): spread "${spread.evs}" ` +
        `(${spread.pct}% de los ${usage.pokemon}), con el ítem y los movimientos de mayor ` +
        `frecuencia real. El razonamiento fino (objetivos priorizados por IA) llega en la Fase 6.`
      : spread
        ? `Datos reales de torneos (${usage.usagePct}% de uso${winrate}): naturaleza ` +
          `${spread.nature} (${spread.pct}% de los ${usage.pokemon}), con el ítem, la habilidad ` +
          `y los movimientos de mayor frecuencia real. Los EVs son genéricos ${derived.label}, ` +
          `derivados de sus stats base — Champions no publica spreads de EVs; la IA (Fase 6) ` +
          `los refinará.`
        : `Datos reales del meta (${usage.usagePct}% de uso${winrate}): ítem, habilidad y ` +
          `movimientos por frecuencia real en torneos. El spread es genérico ${derived.label}, ` +
          `derivado de sus stats base — las fuentes públicas aún no exponen spreads de Champions; ` +
          `la ingesta de torneos (Fase 5) y la IA (Fase 6) lo refinarán.`,
    metaMoves: usage.moves.map((m) => `${m.name} ${m.pct}%`),
  };
}

/** Spread genérico cuando no hay datos de uso (marcado como provisional). */
function fallbackSet(
  species: SpeciesInfo,
  regulation: Regulation,
): Omit<Recommendation, "pokemon" | "benchmarks"> {
  const derived = derivedSpread(species);
  return {
    recommended: {
      nature: derived.nature,
      item: "",
      ability: species.abilities[0],
      teraType: undefined,
      evs: derived.evs,
      moves: [],
    },
    reasoning:
      `Sin datos de uso en ${regulation} para ${species.name}: spread genérico ${derived.label} ` +
      `como punto de partida. Elige 4 movimientos de su movepool; los datos del meta y la IA ` +
      `(Fase 6) refinarán esta recomendación.`,
    metaMoves: [],
  };
}

/**
 * CalcMon de una amenaza. Si el meta trae su spread real se usa; si no
 * (caso actual de Champions), spread neutro sin EVs — números reales del
 * motor sobre una base declarada.
 */
function threatCalcMon(threat: ThreatMon): CalcMon {
  const spread = threat.spreads[0];
  return {
    pokemon: threat.pokemon,
    level: 50,
    nature: spread?.nature ?? "Serious",
    evs: spread ? parseShowdownEvs(spread.evs) : {},
    item: threat.items[0]?.name,
    ability: threat.abilities[0]?.name,
  };
}
