import type { Regulation, TournamentDoc } from "@/types/domain";

export interface RetrieveQuery {
  pokemon: string;
  regulation: Regulation;
  /** Solo torneos desde esta fecha (ISO). */
  since?: string;
  /** Cuántos documentos recuperar (top-k). */
  k?: number;
}

/**
 * Retriever — parte RAG: recupera los sets de torneos más relevantes y
 * recientes por similitud vectorial + filtros (regulación, fecha, Pokémon).
 * (PLAN.md §6, Fase 5.)
 */
export class Retriever {
  async retrieve(query: RetrieveQuery): Promise<TournamentDoc[]> {
    throw new Error(
      `Retriever.retrieve: pendiente (Fase 5) — ${query.pokemon} / ${query.regulation}`,
    );
  }
}
