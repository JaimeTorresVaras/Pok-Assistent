import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { SmogonDamageCalcAdapter } from "@/adapters/smogon/smogonDamageCalcAdapter";
import { StaticMetaAdapter } from "@/adapters/static/staticMetaAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import type { DamageCalcPort } from "@/core/ports/damageCalcPort";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";
import type { PokedexPort } from "@/core/ports/pokedexPort";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";
import { LegalityService } from "@/core/usecases/legality";
import { EVOptimizer } from "@/core/usecases/optimizeEvs";
import { RecommendTeamUseCase } from "@/core/usecases/recommendTeam";

export interface Container {
  pokedex: PokedexPort;
  regulations: RegulationDataPort;
  meta: MetaUsagePort;
  damage: DamageCalcPort;
  legality: LegalityService;
  evOptimizer: EVOptimizer;
  recommendTeam: RecommendTeamUseCase;
}

let instance: Container | null = null;

/**
 * Composition root: la ÚNICA pieza que conoce puertos Y adaptadores a la vez.
 * Aquí se decide qué implementación satisface cada puerto; el núcleo
 * (src/core) nunca importa un adaptador. Singleton por proceso de servidor.
 */
export function getContainer(): Container {
  if (!instance) {
    const pokedex = new PkmnPokedexAdapter();
    const regulations = new StaticRegulationData();
    const meta = new StaticMetaAdapter();
    const damage = new SmogonDamageCalcAdapter();

    const legality = new LegalityService(pokedex, regulations);
    const evOptimizer = new EVOptimizer(pokedex, damage);
    const recommendTeam = new RecommendTeamUseCase({ pokedex, meta, calc: damage, legality });

    instance = { pokedex, regulations, meta, damage, legality, evOptimizer, recommendTeam };
  }
  return instance;
}
