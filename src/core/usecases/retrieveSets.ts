import type { TournamentDoc } from "@/core/domain/model";
import type { EmbeddingsPort } from "@/core/ports/embeddingsPort";
import type { SetRetrievalPort, SetRetrievalQuery } from "@/core/ports/setRetrievalPort";
import type { TournamentStorePort } from "@/core/ports/tournamentStorePort";

/** Texto de consulta que se embebe para buscar sets similares. */
export function buildQueryText(query: SetRetrievalQuery): string {
  return (
    `Sets competitivos recientes de ${query.pokemon} en la regulación ` +
    `${query.regulation} de Pokémon Champions: EVs, naturaleza, ítem y movimientos.`
  );
}

/**
 * Caso de uso RAG: recupera los sets de torneo más relevantes y recientes
 * por similitud vectorial + filtros. Implementa SetRetrievalPort, que es lo
 * que consumirá el AIAdvisor (Fase 6) como grounding. (PLAN.md §6.)
 */
export class RetrieveSets implements SetRetrievalPort {
  constructor(
    private readonly embeddings: EmbeddingsPort,
    private readonly store: TournamentStorePort,
  ) {}

  async retrieve(query: SetRetrievalQuery): Promise<TournamentDoc[]> {
    const [vector] = await this.embeddings.embedQueries([buildQueryText(query)]);
    return this.store.similaritySearch({
      vector,
      regulation: query.regulation,
      pokemon: query.pokemon,
      since: query.since,
      k: query.k ?? 5,
    });
  }
}
