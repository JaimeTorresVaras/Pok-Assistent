import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PgTournamentStore, docToRow, rowToDoc, toVectorLiteral } from "./pgTournamentStore";

import type { TournamentDoc } from "@/core/domain/model";

const DOC: TournamentDoc = {
  id: "test-integration-garchomp",
  source: "Test",
  tournament: "Integration Open",
  date: "2026-07-05",
  regulation: "M-B",
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
  text: "Garchomp @ Life Orb — Jolly, campeón del Integration Open",
};

describe("mapeos puros doc <-> fila", () => {
  it("toVectorLiteral produce el literal de pgvector", () => {
    expect(toVectorLiteral([0.1, -0.2, 3])).toBe("[0.1,-0.2,3]");
  });

  it("docToRow -> rowToDoc es un roundtrip", () => {
    const row = docToRow(DOC);
    expect(row.doc_text).toBe(DOC.text);
    expect(rowToDoc(row)).toEqual(DOC);
  });

  it("rowToDoc tolera jsonb como string u objeto", () => {
    const row = docToRow(DOC);
    expect(rowToDoc({ ...row, set: JSON.stringify(row.set) })).toEqual(DOC); // string
    expect(rowToDoc(row)).toEqual(DOC); // objeto
  });
});

/**
 * Integración real contra Supabase/Postgres. Solo corre si DATABASE_URL está
 * configurada (y tras `npm run db:migrate`); si no, se salta.
 */
const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)("PgTournamentStore (integración, requiere DATABASE_URL)", () => {
  // El cuerpo del describe se ejecuta aunque la suite esté skipped, así que
  // el store se construye en beforeAll (que sí se salta sin DATABASE_URL).
  let store: PgTournamentStore;
  // Vector de prueba con la dimensión del esquema (1024).
  const vector = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));

  beforeAll(() => {
    store = new PgTournamentStore(DATABASE_URL!);
  });

  afterAll(async () => {
    // Limpieza: el cascade borra también doc_embeddings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (store as any).sql`delete from tournament_teams where id like 'test-integration-%'`;
    await store.close();
  });

  it("upsert de docs + embeddings y búsqueda por similitud", async () => {
    await store.upsertDocs([DOC]);
    await store.upsertDocs([DOC]); // idempotente
    await store.upsertEmbeddings([{ docId: DOC.id, embedding: vector, model: "test-model" }]);

    const results = await store.similaritySearch({
      vector,
      regulation: "M-B",
      pokemon: "Garchomp",
      k: 3,
    });

    expect(results.length).toBeGreaterThan(0);
    const found = results.find((d) => d.id === DOC.id);
    expect(found).toBeDefined();
    expect(found?.set.item).toBe("Life Orb");
    expect(found?.teammates).toContain("Sinistcha");
  });

  it("los filtros excluyen lo que no corresponde", async () => {
    const other = await store.similaritySearch({
      vector,
      regulation: "M-B",
      pokemon: "PokémonQueNoExiste",
      k: 3,
    });
    expect(other.find((d) => d.id === DOC.id)).toBeUndefined();
  });
});
