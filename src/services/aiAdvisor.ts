import type { Recommendation, ThreatMon, TournamentDoc } from "@/types/domain";

/**
 * Contexto REAL que se le pasa a Claude. La IA razona sobre estos datos;
 * no inventa stats ni números.
 */
export interface AdvisorContext {
  team: string[];
  threats: ThreatMon[];
  /** Sets recuperados por el Retriever (RAG) como grounding. */
  retrievedSets: TournamentDoc[];
}

/**
 * AIAdvisor — usa la API de Claude con salida estructurada para priorizar
 * objetivos por Pokémon y explicar en lenguaje natural, siempre anclado a
 * datos reales (usage + sets del RAG). (PLAN.md §5, Fase 6.)
 */
export class AIAdvisor {
  async advise(context: AdvisorContext): Promise<Recommendation[]> {
    throw new Error(`AIAdvisor.advise: pendiente (Fase 6) — equipo de ${context.team.length}`);
  }
}
