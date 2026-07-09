import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PgMetaAdapter, rowToThreat } from "./pgMetaAdapter";
import { PgTournamentStore } from "./pgTournamentStore";

import type { ThreatMon, UsageStats } from "@/core/domain/model";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";

const ROW: UsageStats = {
  regulation: "TEST-META",
  pokemon: "Garchomp",
  usagePct: 46.8,
  winratePct: 55.2,
  moves: [
    { name: "Earthquake", pct: 92.1 },
    { name: "Dragon Claw", pct: 80 },
  ],
  items: [{ name: "Life Orb", pct: 61 }],
  abilities: [{ name: "Rough Skin", pct: 100 }],
  spreads: [{ nature: "Jolly", evs: "", pct: 80 }],
  teraTypes: [],
  sampleSize: 40,
};

describe("rowToThreat (mapeo puro fila -> dominio)", () => {
  it("mapea columnas snake_case y tolera jsonb como string u objeto", () => {
    const row = {
      regulation: "TEST-META",
      pokemon: "Garchomp",
      usage_pct: "46.8", // numeric llega como string
      winrate_pct: null,
      moves: JSON.stringify(ROW.moves), // jsonb como string
      items: ROW.items, // jsonb como objeto
      abilities: ROW.abilities,
      spreads: ROW.spreads,
      tera_types: null, // columna vacía
    };
    const t = rowToThreat(row);
    expect(t.usagePct).toBeCloseTo(46.8);
    expect(t.winratePct).toBeUndefined();
    expect(t.moves[0]).toEqual({ name: "Earthquake", pct: 92.1 });
    expect(t.items[0].name).toBe("Life Orb");
    expect(t.teraTypes).toEqual([]);
  });
});

/**
 * Integración real contra Railway/Postgres. Solo corre con DATABASE_URL (y
 * tras `npm run db:migrate`). Usa la regulación TEST-META para no tocar los
 * datos reales de M-B.
 */
const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)("PgMetaAdapter (integración, requiere DATABASE_URL)", () => {
  let store: PgTournamentStore;
  let meta: PgMetaAdapter;

  beforeAll(async () => {
    store = new PgTournamentStore(DATABASE_URL!);
    meta = new PgMetaAdapter(DATABASE_URL!, { ttlMs: 0 }); // sin caché en tests
    await store.replaceUsageStats("TEST-META", [ROW]);
  });

  afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (store as any).sql`delete from usage_stats where regulation = 'TEST-META'`;
    await store.close();
    await meta.close();
  });

  it("topThreats lee el usage vivo de la DB", async () => {
    const top = await meta.topThreats("TEST-META");
    expect(top).toHaveLength(1);
    expect(top[0].pokemon).toBe("Garchomp");
    expect(top[0].usagePct).toBeCloseTo(46.8);
    expect(top[0].moves.map((m) => m.name)).toContain("Earthquake");
    expect(top[0].spreads[0].nature).toBe("Jolly");
  });

  it("usage es case-insensitive y null para mons sin datos", async () => {
    const g = await meta.usage("garchomp", "TEST-META");
    expect(g?.winratePct).toBeCloseTo(55.2);
    expect(await meta.usage("Pikachu", "TEST-META")).toBeNull();
  });

  it("sin datos para la regulación delega en el fallback", async () => {
    const fallbackThreat: ThreatMon = { ...ROW, pokemon: "Fallbackmon" };
    const fallback: MetaUsagePort = {
      topThreats: async () => [fallbackThreat],
      usage: async () => fallbackThreat,
    };
    const withFallback = new PgMetaAdapter(DATABASE_URL!, { ttlMs: 0, fallback });
    try {
      const top = await withFallback.topThreats("TEST-VACIA");
      expect(top[0].pokemon).toBe("Fallbackmon");
      const u = await withFallback.usage("cualquiera", "TEST-VACIA");
      expect(u?.pokemon).toBe("Fallbackmon");
    } finally {
      await withFallback.close();
    }
  });
});
