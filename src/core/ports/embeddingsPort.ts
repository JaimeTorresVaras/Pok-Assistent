/**
 * Puerto de embeddings: convierte texto en vectores para el RAG.
 * Adaptador actual: Voyage AI (src/adapters/voyage). (PLAN.md §2 "Stack RAG".)
 *
 * Documentos y consultas se embeben distinto (input_type de Voyage), por eso
 * hay dos métodos.
 */
export interface EmbeddingsPort {
  /** Identificador del modelo — se versiona junto a cada vector guardado. */
  readonly model: string;

  /** Embeddings de documentos (para indexar). Conserva el orden de entrada. */
  embedDocuments(texts: string[]): Promise<number[][]>;

  /** Embeddings de consultas (para buscar). Conserva el orden de entrada. */
  embedQueries(texts: string[]): Promise<number[][]>;
}
