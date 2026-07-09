import type { EmbeddingsPort } from "@/core/ports/embeddingsPort";

const DEFAULT_BASE_URL = "https://api.voyageai.com/v1";
const DEFAULT_MODEL = "voyage-3.5";
/** Debe coincidir con vector(1024) del esquema (db/migrations/0001_init.sql). */
export const EMBEDDING_DIMENSION = 1024;
/** Tamaño de lote conservador para la API de Voyage. */
const MAX_BATCH = 128;

interface VoyageResponse {
  data: { index: number; embedding: number[] }[];
}

/**
 * Adaptador de EmbeddingsPort sobre la API REST de Voyage AI.
 * (PLAN.md §2 "Stack RAG": embeddings recomendados para usar junto a Claude.)
 */
export class VoyageEmbeddingsAdapter implements EmbeddingsPort {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, opts: { model?: string; baseUrl?: string } = {}) {
    if (!apiKey) throw new Error("VoyageEmbeddingsAdapter: falta la API key (VOYAGE_API_KEY).");
    this.apiKey = apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, "document");
  }

  embedQueries(texts: string[]): Promise<number[][]> {
    return this.embed(texts, "query");
  }

  private async embed(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const batch = texts.slice(i, i + MAX_BATCH);
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
          input_type: inputType,
          output_dimension: EMBEDDING_DIMENSION,
        }),
      });

      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 200);
        throw new Error(`Voyage API ${res.status}: ${detail}`);
      }

      const json = (await res.json()) as VoyageResponse;
      // La API devuelve `index`: restauramos el orden del lote por seguridad.
      const ordered = [...json.data].sort((a, b) => a.index - b.index);
      out.push(...ordered.map((d) => d.embedding));
    }
    return out;
  }
}
