import { PgTournamentStore } from "@/adapters/postgres/pgTournamentStore";
import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { SmogonDamageCalcAdapter } from "@/adapters/smogon/smogonDamageCalcAdapter";
import { StaticMetaAdapter } from "@/adapters/static/staticMetaAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import { VoyageEmbeddingsAdapter } from "@/adapters/voyage/voyageEmbeddingsAdapter";
import type { DamageCalcPort } from "@/core/ports/damageCalcPort";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";
import type { PokedexPort } from "@/core/ports/pokedexPort";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";
import { LegalityService } from "@/core/usecases/legality";
import { EVOptimizer } from "@/core/usecases/optimizeEvs";
import { RecommendTeamUseCase } from "@/core/usecases/recommendTeam";
import { RetrieveSets } from "@/core/usecases/retrieveSets";

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

let retrieval: RetrieveSets | null = null;

/**
 * RAG (Fase 4+): retrieval por similitud sobre Supabase + Voyage.
 * Requiere DATABASE_URL y VOYAGE_API_KEY en el entorno; es lazy para que la
 * app funcione sin credenciales mientras nadie lo use (lo consumen la
 * ingesta de la Fase 5 y el AIAdvisor de la Fase 6).
 */
export function getRetrieval(): RetrieveSets {
  if (!retrieval) {
    const databaseUrl = process.env.DATABASE_URL;
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!databaseUrl || !voyageKey) {
      throw new Error(
        "RAG no configurado: define DATABASE_URL y VOYAGE_API_KEY en .env.local " +
          "y corre `npm run db:migrate` (ver README, Fase 4).",
      );
    }
    retrieval = new RetrieveSets(
      new VoyageEmbeddingsAdapter(voyageKey, { model: process.env.VOYAGE_MODEL }),
      new PgTournamentStore(databaseUrl),
    );
  }
  return retrieval;
}
