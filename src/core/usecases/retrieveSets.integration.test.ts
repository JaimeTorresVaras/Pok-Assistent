import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PgTournamentStore } from "@/adapters/postgres/pgTournamentStore";
import { VoyageEmbeddingsAdapter } from "@/adapters/voyage/voyageEmbeddingsAdapter";
import type { TournamentDoc } from "@/core/domain/model";
import { RetrieveSets } from "@/core/usecases/retrieveSets";

/**
 * RAG end-to-end REAL: Voyage (embeddings) + Railway Postgres (pgvector).
 * Solo corre cuando ambas credenciales están en el entorno; usa una
 * regulación ficticia ("TEST-E2E") para no mezclarse con datos reales y
 * limpia sus filas al terminar.
 */
const READY = Boolean(process.env.DATABASE_URL && process.env.VOYAGE_API_KEY);

const DOC: TournamentDoc = {
  id: "test-e2e-garchomp",
  source: "Test",
  tournament: "E2E Open",
  date: "2026-07-05",
  regulation: "TEST-E2E",
  placement: 1,
  player: "tester",
  pokemon: "Garchomp",
  set: {
    nature: "Jolly",
    item: "Life Orb",
    ability: "Rough Skin",
    teraType: "",
    evs: { atk: 252, spe: 252, hp: 4 },
    moves: ["Earthquake", "Dragon Claw", "Protect", "Swords Dance"],
  },
  teammates: ["Sinistcha", "Whimsicott"],
  text:
    "Garchomp @ Life Orb — Jolly, 252 Atk / 4 HP / 252 Spe, con Earthquake, " +
    "Dragon Claw, Protect y Swords Dance; campeón del E2E Open junto a Sinistcha y Whimsicott.",
};

describe.skipIf(!READY)("RAG end-to-end (Voyage + Railway pgvector)", () => {
  let store: PgTournamentStore;
  let embeddings: VoyageEmbeddingsAdapter;

  beforeAll(() => {
    store = new PgTournamentStore(process.env.DATABASE_URL!);
    embeddings = new VoyageEmbeddingsAdapter(process.env.VOYAGE_API_KEY!, {
      model: process.env.VOYAGE_MODEL,
    });
  });

  afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (store as any).sql`delete from tournament_teams where regulation = 'TEST-E2E'`;
    await store.close();
  });

  it("indexa un documento real y lo recupera por similitud", async () => {
    // 1. Guardar el doc y su embedding REAL (pipeline de ingesta en miniatura)
    await store.upsertDocs([DOC]);
    const [vector] = await embeddings.embedDocuments([DOC.text]);
    expect(vector).toHaveLength(1024);
    await store.upsertEmbeddings([{ docId: DOC.id, embedding: vector, model: embeddings.model }]);

    // 2. Recuperar vía el caso de uso completo (embed de consulta + similitud)
    const retrieval = new RetrieveSets(embeddings, store);
    const results = await retrieval.retrieve({
      pokemon: "Garchomp",
      regulation: "TEST-E2E",
      k: 3,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(DOC.id);
    expect(results[0].set.item).toBe("Life Orb");
  }, 60_000);
});
