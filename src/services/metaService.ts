import { getMeta } from "@/data/meta";
import type { Regulation, ThreatMon } from "@/types/domain";

/**
 * MetaService — top de Pokémon del meta con sets/ítems/moves más usados.
 * (PLAN.md Fase 1.) Arranca leyendo un dataset (placeholder por ahora); más
 * adelante el usage se recalcula solo desde la ingesta de torneos (Fase 5).
 */
export class MetaService {
  /** Amenazas top de la regulación, ordenadas por uso descendente. */
  getTopThreats(regulation: Regulation, limit = 30): ThreatMon[] {
    return [...getMeta(regulation)].sort((a, b) => b.usagePct - a.usagePct).slice(0, limit);
  }

  /** Datos de uso de un Pokémon concreto (case-insensitive). Lanza si no hay. */
  getUsage(pokemon: string, regulation: Regulation): ThreatMon {
    const target = pokemon.toLowerCase();
    const found = getMeta(regulation).find((t) => t.pokemon.toLowerCase() === target);
    if (!found) {
      throw new Error(`MetaService: sin datos de uso para "${pokemon}" en ${regulation}`);
    }
    return found;
  }
}
