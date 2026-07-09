import type { Regulation, ThreatMon } from "@/core/domain/model";

/**
 * Puerto de uso del meta: top de amenazas con sus sets/ítems/moves más
 * usados. Asíncrono porque el adaptador principal lee de la base de datos
 * (usage_stats, recalculado por la ingesta de la Fase 5); existe además un
 * adaptador estático de respaldo. (PLAN.md §2.)
 */
export interface MetaUsagePort {
  /** Amenazas top ordenadas por uso descendente. */
  topThreats(regulation: Regulation, limit?: number): Promise<ThreatMon[]>;

  /** Uso de un Pokémon concreto (case-insensitive); null si no hay datos. */
  usage(pokemon: string, regulation: Regulation): Promise<ThreatMon | null>;
}
