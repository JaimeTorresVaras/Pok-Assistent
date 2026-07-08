import type { SpeciesInfo } from "@/core/domain/model";

/**
 * Puerto de Pokédex: datos duros de especies (stats base, tipos, movepool).
 * Adaptador actual: @pkmn (src/adapters/pkmn). (PLAN.md §2 "DexService".)
 */
export interface PokedexPort {
  /** Especie por nombre o id normalizado; null si no existe. */
  getSpecies(nameOrId: string): SpeciesInfo | null;

  /**
   * Movimientos aprendibles en la generación activa (incluye herencia de
   * pre-evoluciones). Lanza si la especie no existe.
   */
  getLearnset(nameOrId: string): Promise<string[]>;
}
