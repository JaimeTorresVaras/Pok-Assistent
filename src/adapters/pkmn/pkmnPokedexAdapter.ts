import { Generations, type Generation, type Specie } from "@pkmn/data";
import { Dex } from "@pkmn/dex";

import { toID } from "@/core/domain/ids";
import type { SpeciesInfo } from "@/core/domain/model";
import type { PokedexPort } from "@/core/ports/pokedexPort";

const DEFAULT_GEN = 9;

/**
 * Filtro de existencia ampliado para Pokémon Champions: el roster incluye
 * Pokémon y megas que no están en los juegos de la gen 9 (marcados como
 * "Past" en @pkmn, p. ej. Aerodactyl o Charizard-Mega-Y), así que no podemos
 * usar el filtro de legalidad por defecto de @pkmn/data.
 */
function championsExists(d: { exists?: boolean; isNonstandard?: string | null }): boolean {
  if (!d.exists) return false;
  if (d.isNonstandard && d.isNonstandard !== "Past") return false;
  return true;
}

/** Adaptador de PokedexPort sobre el ecosistema @pkmn. */
export class PkmnPokedexAdapter implements PokedexPort {
  private readonly gen: Generation;

  constructor(genNum: number = DEFAULT_GEN) {
    const gens = new Generations(
      Dex,
      championsExists as ConstructorParameters<typeof Generations>[1],
    );
    this.gen = gens.get(genNum as Parameters<Generations["get"]>[0]);
  }

  getSpecies(nameOrId: string): SpeciesInfo | null {
    const species = this.gen.species.get(nameOrId);
    if (!species?.exists) return null;
    const { hp, atk, def, spa, spd, spe } = species.baseStats;
    return {
      id: species.id,
      name: species.name,
      baseSpeciesId: species.baseSpecies ? toID(species.baseSpecies) : species.id,
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
   *
   * ⚠️ Limitación conocida: los learnsets vienen de los juegos principales;
   * el movepool exacto de Champions (502 movimientos permitidos en M-B)
   * puede diferir. Se refinará con datos propios de Champions.
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
