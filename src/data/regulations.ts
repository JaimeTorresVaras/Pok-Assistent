import type { Regulation } from "@/types/domain";

/**
 * Allowlists por regulación. En Pokémon Champions la legalidad se define por
 * ALLOWLIST (lista de permitidos), no por banlist. (PLAN.md §0.)
 *
 * ⚠️ PLACEHOLDER: la lista de M-B es un subconjunto de EJEMPLO con nombres
 * reales, suficiente para programar y testear la legalidad. Reemplazar por la
 * allowlist completa y oficial de la Reg. M-B.
 */
const ALLOWLISTS: Record<string, string[]> = {
  "M-B": [
    "Garchomp",
    "Amoonguss",
    "Incineroar",
    "Flutter Mane",
    "Whimsicott",
    "Kingambit",
    "Rillaboom",
    "Landorus-Therian",
    "Urshifu-Rapid-Strike",
    "Chien-Pao",
    "Gholdengo",
    "Tornadus",
    "Iron Hands",
    "Ogerpon-Hearthflame",
    "Raging Bolt",
  ],
};

/** Normaliza un nombre al "id" de @pkmn (minúsculas, solo alfanumérico). */
function toID(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const cache = new Map<string, Set<string>>();

/**
 * Allowlist de una regulación, como Set de IDs normalizados (para comparar
 * contra `species.id` sin problemas de mayúsculas/guiones). Set vacío si la
 * regulación no tiene datos cargados.
 */
export function getAllowlist(regulation: Regulation): Set<string> {
  let set = cache.get(regulation);
  if (!set) {
    set = new Set((ALLOWLISTS[regulation] ?? []).map(toID));
    cache.set(regulation, set);
  }
  return set;
}

/** ¿Tenemos allowlist cargada para esta regulación? */
export function isRegulationSupported(regulation: Regulation): boolean {
  return regulation in ALLOWLISTS;
}

/** Regulaciones con datos cargados. */
export function supportedRegulations(): Regulation[] {
  return Object.keys(ALLOWLISTS);
}
