import type { Recommendation, ThreatMon, TournamentDoc } from "@/core/domain/model";

/**
 * Contexto REAL que se le pasa al asesor de IA. La IA razona sobre estos
 * datos; no inventa stats ni números.
 */
export interface AdvisorContext {
  team: string[];
  threats: ThreatMon[];
  /** Sets recuperados por el puerto RAG como grounding. */
  retrievedSets: TournamentDoc[];
}

/**
 * Puerto del asesor de IA: prioriza objetivos y explica en lenguaje natural,
 * anclado a datos reales. Adaptador previsto (Fase 6): API de Claude con
 * salida estructurada. Todo lo que devuelva se revalida en el núcleo antes
 * de mostrarse. (PLAN.md §5.)
 */
export interface AdvisorPort {
  advise(context: AdvisorContext): Promise<Recommendation[]>;
}
