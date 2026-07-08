import type { Regulation } from "@/core/domain/model";
import type { PokedexPort } from "@/core/ports/pokedexPort";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";

/**
 * Legalidad por regulación: un Pokémon es legal si existe en la Pokédex Y
 * está en la allowlist de la regulación. (PLAN.md §0: pool = allowlist.)
 */
export class LegalityService {
  constructor(
    private readonly pokedex: PokedexPort,
    private readonly regulations: RegulationDataPort,
  ) {}

  isLegal(pokemon: string, regulation: Regulation): boolean {
    const species = this.pokedex.getSpecies(pokemon);
    if (!species) return false;
    return this.regulations.allowlist(regulation).has(species.id);
  }

  /** Nombres canónicos de todos los Pokémon legales, ordenados. */
  listLegal(regulation: Regulation): string[] {
    const names: string[] = [];
    for (const id of this.regulations.allowlist(regulation)) {
      const species = this.pokedex.getSpecies(id);
      if (species) names.push(species.name);
    }
    return names.sort();
  }
}
