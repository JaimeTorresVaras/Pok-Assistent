import type { Regulation } from "@/core/domain/model";

/**
 * Puerto de datos de regulación: qué Pokémon están PERMITIDOS en cada
 * regulación (Champions usa allowlist, no banlist). Adaptador actual: datos
 * estáticos (src/adapters/static); a futuro podría venir de la base de datos.
 */
export interface RegulationDataPort {
  /** Ids normalizados permitidos en la regulación (vacío si no hay datos). */
  allowlist(regulation: Regulation): ReadonlySet<string>;

  isSupported(regulation: Regulation): boolean;

  supported(): Regulation[];
}
