import { toID } from "@/core/domain/ids";
import type { Regulation } from "@/core/domain/model";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";

/**
 * Adaptador estático de RegulationDataPort.
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

export class StaticRegulationData implements RegulationDataPort {
  private readonly cache = new Map<string, Set<string>>();

  allowlist(regulation: Regulation): ReadonlySet<string> {
    let set = this.cache.get(regulation);
    if (!set) {
      set = new Set((ALLOWLISTS[regulation] ?? []).map(toID));
      this.cache.set(regulation, set);
    }
    return set;
  }

  isSupported(regulation: Regulation): boolean {
    return regulation in ALLOWLISTS;
  }

  supported(): Regulation[] {
    return Object.keys(ALLOWLISTS);
  }
}
