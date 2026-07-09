import { describe, expect, it } from "vitest";

import type { TournamentDoc } from "@/core/domain/model";
import type { EmbeddingsPort } from "@/core/ports/embeddingsPort";
import type { SimilaritySearch, TournamentStorePort } from "@/core/ports/tournamentStorePort";
import { RetrieveSets, buildQueryText } from "@/core/usecases/retrieveSets";

const DOC: TournamentDoc = {
  id: "limitless-2026-07-05-place3-garchomp",
  source: "Limitless VGC",
  tournament: "Test Open",
  date: "2026-07-05",
  regulation: "M-B",
  placement: 3,
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
  text: "Garchomp @ Life Orb — Jolly, top 3 en Test Open 2026",
};

describe("RetrieveSets (con puertos falsos)", () => {
  it("embebe la consulta y busca por similitud con los filtros", async () => {
    const embedded: string[] = [];
    const searches: SimilaritySearch[] = [];

    const embeddings: EmbeddingsPort = {
      model: "fake-model",
      embedDocuments: async () => [],
      embedQueries: async (texts) => {
        embedded.push(...texts);
        return [[0.1, 0.2, 0.3]];
      },
    };
    const store: TournamentStorePort = {
      upsertDocs: async () => {},
      upsertEmbeddings: async () => {},
      similaritySearch: async (q) => {
        searches.push(q);
        return [DOC];
      },
      embeddedDocIds: async () => new Set<string>(),
      listDocs: async () => [],
      replaceUsageStats: async () => {},
      getState: async () => null,
      setState: async () => {},
      close: async () => {},
    };

    const usecase = new RetrieveSets(embeddings, store);
    const result = await usecase.retrieve({
      pokemon: "Garchomp",
      regulation: "M-B",
      since: "2026-06-17",
      k: 3,
    });

    expect(result).toEqual([DOC]);
    expect(embedded).toHaveLength(1);
    expect(embedded[0]).toContain("Garchomp");
    expect(searches[0]).toMatchObject({
      vector: [0.1, 0.2, 0.3],
      regulation: "M-B",
      pokemon: "Garchomp",
      since: "2026-06-17",
      k: 3,
    });
  });

  it("k por defecto es 5", async () => {
    let seenK: number | undefined;
    const embeddings: EmbeddingsPort = {
      model: "fake",
      embedDocuments: async () => [],
      embedQueries: async () => [[1]],
    };
    const store: TournamentStorePort = {
      upsertDocs: async () => {},
      upsertEmbeddings: async () => {},
      similaritySearch: async (q) => {
        seenK = q.k;
        return [];
      },
      embeddedDocIds: async () => new Set<string>(),
      listDocs: async () => [],
      replaceUsageStats: async () => {},
      getState: async () => null,
      setState: async () => {},
      close: async () => {},
    };

    await new RetrieveSets(embeddings, store).retrieve({ pokemon: "Garchomp", regulation: "M-B" });
    expect(seenK).toBe(5);
  });

  it("buildQueryText incluye Pokémon y regulación", () => {
    const text = buildQueryText({ pokemon: "Sinistcha", regulation: "M-B" });
    expect(text).toContain("Sinistcha");
    expect(text).toContain("M-B");
  });
});
