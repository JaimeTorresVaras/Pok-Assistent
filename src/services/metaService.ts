import type { Regulation, ThreatMon } from "@/types/domain";

/**
 * MetaService — top de Pokémon del meta con sets/ítems/moves más usados.
 * (PLAN.md Fase 1.) Arranca leyendo un dataset manual (`meta_reg-mb.json`);
 * más adelante el usage se recalcula solo desde la ingesta de torneos.
 */
export class MetaService {
  /** Amenazas top de la regulación, ordenadas por uso. */
  getTopThreats(regulation: Regulation, limit = 30): ThreatMon[] {
    throw new Error(
      `MetaService.getTopThreats: pendiente (Fase 1) — ${regulation} (limit ${limit})`,
    );
  }

  /** Datos de uso de un Pokémon concreto en la regulación. */
  getUsage(pokemon: string, regulation: Regulation): ThreatMon {
    throw new Error(`MetaService.getUsage: pendiente (Fase 1) — ${pokemon} / ${regulation}`);
  }
}
