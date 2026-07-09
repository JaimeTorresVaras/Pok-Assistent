import type { Regulation, TournamentDoc } from "@/core/domain/model";

/** Un vector listo para guardar, versionado con su modelo. */
export interface EmbeddingRecord {
  docId: string;
  embedding: number[];
  model: string;
}

/** Búsqueda por similitud + filtros (PLAN.md §6 "Retrieval"). */
export interface SimilaritySearch {
  vector: number[];
  regulation: Regulation;
  pokemon?: string;
  /** Solo torneos desde esta fecha (ISO). */
  since?: string;
  /** Cuántos documentos devolver (top-k). */
  k?: number;
}

/**
 * Puerto de almacenamiento de torneos + vectores.
 * Adaptador actual: Postgres + pgvector en Supabase (src/adapters/postgres).
 */
export interface TournamentStorePort {
  /** Inserta/actualiza documentos de torneo (idempotente por id). */
  upsertDocs(docs: TournamentDoc[]): Promise<void>;

  /** Inserta/actualiza los vectores de documentos ya guardados. */
  upsertEmbeddings(records: EmbeddingRecord[]): Promise<void>;

  /** Documentos más cercanos al vector, filtrados y ordenados por similitud. */
  similaritySearch(query: SimilaritySearch): Promise<TournamentDoc[]>;

  /** Cierra las conexiones (jobs de ingesta / tests). */
  close(): Promise<void>;
}
