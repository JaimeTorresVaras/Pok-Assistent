import allowlistMB from "./data/allowlist-mb.json";

import { toID } from "@/core/domain/ids";
import type { Regulation } from "@/core/domain/model";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";

/**
 * Adaptador estático de RegulationDataPort con datos REALES.
 *
 * Fuente M-B: roster completo de Pokémon Champions (209 especies) — en esta
 * regulación no hay bans, así que allowlist = roster. Ver `source` y
 * `retrievedAt` dentro de data/allowlist-mb.json. Dataset manual por ahora;
 * la ingesta automática (Fase 5) lo mantendrá al día.
 *
 * Nota: la lista es por ESPECIE. Las formas y megas se aceptan vía la especie
 * base en LegalityService (p. ej. Charizard-Mega-Y cuenta como Charizard).
 */
const ALLOWLISTS: Record<string, string[]> = {
  [allowlistMB.regulation]: allowlistMB.pokemon,
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
