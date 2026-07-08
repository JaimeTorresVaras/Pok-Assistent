import { Generations, type Generation, type Specie } from "@pkmn/data";
import { Dex } from "@pkmn/dex";

import type { SpeciesInfo } from "@/core/domain/model";
import type { PokedexPort } from "@/core/ports/pokedexPort";

const DEFAULT_GEN = 9;

/** Adaptador de PokedexPort sobre el ecosistema @pkmn. */
export class PkmnPokedexAdapter implements PokedexPort {
  private readonly gen: Generation;

  constructor(genNum: number = DEFAULT_GEN) {
    this.gen = new Generations(Dex).get(genNum as Parameters<Generations["get"]>[0]);
  }

  getSpecies(nameOrId: string): SpeciesInfo | null {
    const species = this.gen.species.get(nameOrId);
    if (!species?.exists) return null;
    const { hp, atk, def, spa, spd, spe } = species.baseStats;
    return {
      id: species.id,
      name: species.name,
      baseStats: { hp, atk, def, spa, spd, spe },
      types: [...species.types],
      abilities: Object.values(species.abilities).filter(
        (a): a is string => typeof a === "string" && a.length > 0,
      ),
    };
  }

  /**
   * Movimientos aprendibles en esta generación, incluyendo los heredados de
   * las pre-evoluciones. Nombres ordenados alfabéticamente.
   */
  async getLearnset(nameOrId: string): Promise<string[]> {
    const genPrefix = String(this.gen.num);
    const moveIds = new Set<string>();

    let current: Specie | undefined = this.requireSpecies(nameOrId);
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

  private requireSpecies(nameOrId: string): Specie {
    const species = this.gen.species.get(nameOrId);
    if (!species?.exists) throw new Error(`Pokédex: Pokémon desconocido "${nameOrId}"`);
    return species;
  }
}
