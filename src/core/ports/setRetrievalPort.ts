import type { Regulation, TournamentDoc } from "@/core/domain/model";

export interface SetRetrievalQuery {
  pokemon: string;
  regulation: Regulation;
  /** Solo torneos desde esta fecha (ISO). */
  since?: string;
  /** Cuántos documentos recuperar (top-k). */
  k?: number;
}

/**
 * Puerto RAG: recupera sets de torneos recientes por similitud vectorial +
 * filtros. Adaptador previsto (Fase 5): Postgres + pgvector (Supabase) con
 * embeddings de Voyage. (PLAN.md §6.)
 */
export interface SetRetrievalPort {
  retrieve(query: SetRetrievalQuery): Promise<TournamentDoc[]>;
}
