import type { Regulation, StatKey } from "@/types/domain";

/**
 * DexService — datos duros de la Pokédex y legalidad por regulación.
 * (PLAN.md Fase 1.) Se apoyará en `@pkmn/dex` / `@pkmn/data` para no
 * hardcodear stats ni movepools.
 */
export class DexService {
  /** ¿Es legal este Pokémon en la regulación dada? (allowlist, no banlist) */
  isLegal(pokemon: string, regulation: Regulation): boolean {
    throw new Error(`DexService.isLegal: pendiente (Fase 1) — ${pokemon} / ${regulation}`);
  }

  /** Stats base del Pokémon. */
  getBaseStats(pokemon: string): Record<StatKey, number> {
    throw new Error(`DexService.getBaseStats: pendiente (Fase 1) — ${pokemon}`);
  }

  /** Movimientos que el Pokémon puede aprender en esta generación. */
  getLearnset(pokemon: string): string[] {
    throw new Error(`DexService.getLearnset: pendiente (Fase 1) — ${pokemon}`);
  }
}
