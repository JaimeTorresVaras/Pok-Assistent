import type { Regulation, TournamentDoc, UsageStats } from "@/core/domain/model";

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

  /**
   * De estos ids, cuáles YA TIENEN embedding (para embeder solo lo que
   * falta — cubre también reanudar una ingesta que falló a medias).
   */
  embeddedDocIds(ids: string[]): Promise<Set<string>>;

  /** Docs de una regulación (opcionalmente desde una fecha), más recientes primero. */
  listDocs(regulation: Regulation, since?: string): Promise<TournamentDoc[]>;

  /** Reemplaza el usage agregado de la regulación (delete + insert atómico). */
  replaceUsageStats(regulation: Regulation, rows: UsageStats[]): Promise<void>;

  /** Estado del pipeline de ingesta (p. ej. torneos ya procesados). */
  getState(key: string): Promise<unknown | null>;
  setState(key: string, value: unknown): Promise<void>;

  /** Cierra las conexiones (jobs de ingesta / tests). */
  close(): Promise<void>;
}
