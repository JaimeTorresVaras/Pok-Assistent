import { describe, expect, it } from "vitest";

import { StaticMetaAdapter } from "@/adapters/static/staticMetaAdapter";

describe("StaticMetaAdapter (datos reales de torneos Reg M-B)", () => {
  const meta = new StaticMetaAdapter();

  it("el top está ordenado por uso y Garchomp es #1", async () => {
    const top = await meta.topThreats("M-B");
    expect(top.length).toBeGreaterThanOrEqual(10);
    expect(top[0].pokemon).toBe("Garchomp");
    // ordenado descendente
    for (let i = 1; i < top.length; i++) {
      expect(top[i].usagePct).toBeLessThanOrEqual(top[i - 1].usagePct);
    }
  });

  it("cada amenaza trae movimientos/ítems/habilidades con % reales", async () => {
    for (const t of await meta.topThreats("M-B")) {
      expect(t.moves.length).toBeGreaterThan(0);
      expect(t.items.length).toBeGreaterThan(0);
      expect(t.abilities.length).toBeGreaterThan(0);
      for (const e of [...t.moves, ...t.items, ...t.abilities]) {
        expect(e.pct).toBeGreaterThan(0);
        expect(e.pct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("usage encuentra por nombre (case-insensitive)", async () => {
    const s = await meta.usage("sinistcha", "M-B");
    expect(s?.pokemon).toBe("Sinistcha");
    expect(s?.moves.map((m) => m.name)).toContain("Rage Powder");
  });

  it("usage devuelve null para Pokémon sin datos (Amoonguss no está en Champions)", async () => {
    expect(await meta.usage("Amoonguss", "M-B")).toBeNull();
    expect(await meta.usage("Vileplume", "M-B")).toBeNull(); // legal pero fuera del top
  });

  it("una regulación sin datos devuelve lista vacía", async () => {
    expect(await meta.topThreats("Z-Z")).toEqual([]);
  });
});
