/**
 * Pipeline de ingesta de torneos (PLAN.md §6, Fase 5). Job programado que
 * mantiene el dataset del meta y el vector store al día:
 *
 *   fetch → parse → deduplicar/validar → recalcular usage → embeddings → resumen IA
 *
 * Cada paso está como stub; se implementa en la Fase 5.
 */
import type { Regulation, TournamentDoc } from "@/types/domain";

/** 1. Descarga team pastes nuevos de las fuentes (solo lo posterior a la marca). */
export async function fetchNewPastes(regulation: Regulation, since?: string): Promise<string[]> {
  throw new Error(
    `ingest.fetchNewPastes: pendiente (Fase 5) — ${regulation} desde ${since ?? "el inicio"}`,
  );
}

/** 2. Parsea un paste a documento estructurado (con `@pkmn/sets`). */
export function parsePaste(raw: string, meta: Partial<TournamentDoc>): TournamentDoc {
  throw new Error(
    `ingest.parsePaste: pendiente (Fase 5) — ${meta.pokemon ?? "?"} (${raw.length} chars)`,
  );
}

/** 3+4. Deduplica, valida legalidad y recalcula usage con decaimiento temporal. */
export function recalcUsage(docs: TournamentDoc[]): void {
  throw new Error(`ingest.recalcUsage: pendiente (Fase 5) — ${docs.length} docs`);
}

/** 5. Genera embeddings (Voyage) y los guarda en pgvector. */
export async function embedAndStore(docs: TournamentDoc[]): Promise<void> {
  throw new Error(`ingest.embedAndStore: pendiente (Fase 5) — ${docs.length} docs`);
}
