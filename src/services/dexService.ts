import { Dex } from "@pkmn/dex";
import { Generations, type Generation, type Specie } from "@pkmn/data";

import { getAllowlist } from "@/data/regulations";
import type { Regulation, StatKey } from "@/types/domain";

const DEFAULT_GEN = 9;

/**
 * DexService — datos duros de la Pokédex (vía `@pkmn`) y legalidad por
 * regulación (vía allowlist). (PLAN.md Fase 1.)
 */
export class DexService {
  private readonly gen: Generation;

  constructor(genNum: number = DEFAULT_GEN) {
    this.gen = new Generations(Dex).get(genNum);
  }

  /** ¿Existe este Pokémon en la generación? */
  exists(pokemon: string): boolean {
    return this.gen.species.get(pokemon)?.exists ?? false;
  }

  /**
   * ¿Es legal en la regulación? Debe existir en la generación Y estar en la
   * allowlist de esa regulación (Champions usa allowlist, no banlist).
   */
  isLegal(pokemon: string, regulation: Regulation): boolean {
    const species = this.gen.species.get(pokemon);
    if (!species?.exists) return false;
    return getAllowlist(regulation).has(species.id);
  }

  /** Stats base del Pokémon. Lanza si no existe. */
  getBaseStats(pokemon: string): Record<StatKey, number> {
    const { hp, atk, def, spa, spd, spe } = this.requireSpecies(pokemon).baseStats;
    return { hp, atk, def, spa, spd, spe };
  }

  /** Tipos del Pokémon. Lanza si no existe. */
  getTypes(pokemon: string): string[] {
    return [...this.requireSpecies(pokemon).types];
  }

  /**
   * Movimientos aprendibles en esta generación, incluyendo los heredados de
   * las pre-evoluciones. Devuelve nombres ordenados alfabéticamente.
   */
  async getLearnset(pokemon: string): Promise<string[]> {
    const genPrefix = String(this.gen.num);
    const moveIds = new Set<string>();

    let current: Specie | undefined = this.requireSpecies(pokemon);
    while (current) {
      const entry = await this.gen.learnsets.get(current.id);
      if (entry?.learnset) {
        for (const [moveId, sources] of Object.entries(entry.learnset)) {
          if (sources.some((src) => src.startsWith(genPrefix))) moveIds.add(moveId);
        }
      }
      current = current.prevo ? this.gen.species.get(current.prevo) : undefined;
    }

    const names: string[] = [];
    for (const id of moveIds) {
      const move = this.gen.moves.get(id);
      if (move?.exists) names.push(move.name);
    }
    return names.sort();
  }

  private requireSpecies(pokemon: string): Specie {
    const species = this.gen.species.get(pokemon);
    if (!species?.exists) throw new Error(`DexService: Pokémon desconocido "${pokemon}"`);
    return species;
  }
}
