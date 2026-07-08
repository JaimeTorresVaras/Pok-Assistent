import type { Regulation, ThreatMon } from "@/core/domain/model";

/**
 * Puerto de uso del meta: top de amenazas con sus sets/ítems/moves más
 * usados. Adaptador actual: dataset estático (placeholder); en la Fase 5 lo
 * recalcula la ingesta de torneos desde la base de datos. (PLAN.md §2.)
 */
export interface MetaUsagePort {
  /** Amenazas top ordenadas por uso descendente. */
  topThreats(regulation: Regulation, limit?: number): ThreatMon[];

  /** Uso de un Pokémon concreto (case-insensitive); null si no hay datos. */
  usage(pokemon: string, regulation: Regulation): ThreatMon | null;
}
