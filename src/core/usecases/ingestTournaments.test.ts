import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import type { PokemonSet, TournamentDoc, UsageStats } from "@/core/domain/model";
import type { EmbeddingsPort } from "@/core/ports/embeddingsPort";
import type {
  SourceTeam,
  SourceTournament,
  TournamentSourcePort,
} from "@/core/ports/tournamentSourcePort";
import type { EmbeddingRecord, TournamentStorePort } from "@/core/ports/tournamentStorePort";
import { IngestTournamentsUseCase, buildDoc } from "@/core/usecases/ingestTournaments";
import { LegalityService } from "@/core/usecases/legality";

const NOW = "2026-07-09";

function mkSet(): PokemonSet {
  return {
    nature: "Jolly",
    item: "Life Orb",
    ability: "Rough Skin",
    teraType: "",
    evs: {},
    moves: ["Earthquake", "Protect"],
  };
}

const T1: SourceTournament = {
  slug: "t1",
  name: "Torneo Uno",
  date: "2026-07-06",
  source: "limitless",
};
const T2: SourceTournament = {
  slug: "t2",
  name: "Torneo Dos (ya procesado)",
  date: "2026-07-05",
  source: "limitless",
};

const TEAM: SourceTeam = {
  player: "Tester One",
  placement: 1,
  wins: 5,
  losses: 1,
  sets: [
    { pokemon: "Garchomp", set: mkSet() }, // legal normal
    { pokemon: "Amoonguss", set: mkSet() }, // NO está en Champions -> se salta
    { pokemon: "Raichu-Mega-X", set: mkSet() }, // mega exclusiva: base en allowlist
  ],
};

class FakeSource implements TournamentSourcePort {
  fetchedTeamsFor: string[] = [];
  async listRecent() {
    return [T1, T2];
  }
  async fetchTeams(t: SourceTournament) {
    this.fetchedTeamsFor.push(t.slug);
    return [TEAM];
  }
}

class FakeStore implements TournamentStorePort {
  docs = new Map<string, TournamentDoc>();
  embedded: EmbeddingRecord[] = [];
  usage: { regulation: string; rows: UsageStats[] } | null = null;
  state = new Map<string, unknown>();
  preExisting = new Set<string>();

  async upsertDocs(ds: TournamentDoc[]) {
    for (const d of ds) this.docs.set(d.id, d);
  }
  async upsertEmbeddings(rs: EmbeddingRecord[]) {
    this.embedded.push(...rs);
  }
  async similaritySearch() {
    return [];
  }
  async embeddedDocIds(ids: string[]) {
    return new Set(ids.filter((i) => this.preExisting.has(i)));
  }
  async listDocs(regulation: string) {
    return [...this.docs.values()].filter((d) => d.regulation === regulation);
  }
  async replaceUsageStats(regulation: string, rows: UsageStats[]) {
    this.usage = { regulation, rows };
  }
  async getState(key: string) {
    return this.state.get(key) ?? null;
  }
  async setState(key: string, value: unknown) {
    this.state.set(key, value);
  }
  async close() {}
}

const fakeEmbeddings: EmbeddingsPort = {
  model: "fake-emb",
  embedDocuments: async (texts) => texts.map((_, i) => [i + 1, 0.5]),
  embedQueries: async () => [[0]],
};

const regulations = new StaticRegulationData();
const legality = new LegalityService(new PkmnPokedexAdapter(), regulations);

function mkUsecase(store: FakeStore, source = new FakeSource()) {
  return {
    source,
    usecase: new IngestTournamentsUseCase({
      source,
      store,
      embeddings: fakeEmbeddings,
      legality,
      regulations,
    }),
  };
}

describe("IngestTournamentsUseCase", () => {
  it("procesa solo torneos nuevos, valida legalidad y embebe solo docs nuevos", async () => {
    const store = new FakeStore();
    // t2 ya fue procesado en una corrida anterior
    store.state.set("ingest:limitless:M-B:processed", ["t2"]);
    // el doc de Garchomp ya tenía embedding -> no se re-embebe
    store.preExisting.add("limitless-t1-p1-testerone-garchomp");

    const { usecase, source } = mkUsecase(store);
    const summary = await usecase.exec({ regulation: "M-B", now: NOW });

    // Solo t1 (t2 estaba en la marca de agua)
    expect(summary.tournamentsProcessed).toEqual(["t1"]);
    expect(source.fetchedTeamsFor).toEqual(["t1"]);

    // Amoonguss (fuera de Champions) se salta; Garchomp y Raichu-Mega-X entran
    expect(summary.docsUpserted).toBe(2);
    expect(summary.monsSkipped).toEqual(["Amoonguss"]);
    expect(store.docs.has("limitless-t1-p1-testerone-garchomp")).toBe(true);
    expect(store.docs.has("limitless-t1-p1-testerone-raichumegax")).toBe(true);

    // Embeddings: solo el doc nuevo (Raichu), con el modelo versionado
    expect(summary.docsEmbedded).toBe(1);
    expect(store.embedded).toHaveLength(1);
    expect(store.embedded[0].docId).toBe("limitless-t1-p1-testerone-raichumegax");
    expect(store.embedded[0].model).toBe("fake-emb");

    // Usage recalculado sobre el corpus y guardado
    expect(store.usage?.regulation).toBe("M-B");
    expect(store.usage?.rows.map((r) => r.pokemon).sort()).toEqual(["Garchomp", "Raichu-Mega-X"]);
    expect(summary.usageRows).toBe(2);

    // Marca de agua actualizada
    expect(store.state.get("ingest:limitless:M-B:processed")).toEqual(["t2", "t1"]);
  });

  it("re-correr sin torneos nuevos no hace nada", async () => {
    const store = new FakeStore();
    store.state.set("ingest:limitless:M-B:processed", ["t1", "t2"]);

    const { usecase } = mkUsecase(store);
    const summary = await usecase.exec({ regulation: "M-B", now: NOW });

    expect(summary.tournamentsProcessed).toEqual([]);
    expect(summary.docsUpserted).toBe(0);
    expect(store.embedded).toHaveLength(0);
  });

  it("buildDoc arma id estable y texto descriptivo para embeder", () => {
    const doc = buildDoc(T1, TEAM, "Garchomp", mkSet(), "M-B");

    expect(doc.id).toBe("limitless-t1-p1-testerone-garchomp");
    expect(doc.teammates).toEqual(["Amoonguss", "Raichu-Mega-X"]);
    expect(doc.wins).toBe(5);
    expect(doc.text).toContain("Garchomp @ Life Orb");
    expect(doc.text).toContain("Jolly");
    expect(doc.text).toContain("puesto #1 (5-1)");
    expect(doc.text).toContain("Torneo Uno");
  });
});
