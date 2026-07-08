import { Generations, Pokemon } from "@smogon/calc";
import { describe, expect, it } from "vitest";

import { CalcEngine } from "@/services/calcEngine";
import type { Nature, StatKey } from "@/types/domain";

describe("CalcEngine.calcDamage (dobles)", () => {
  const engine = new CalcEngine();

  it("Garchomp Earthquake vs Amoonguss coincide con @smogon/calc", () => {
    const result = engine.calcDamage(
      {
        pokemon: "Garchomp",
        level: 50,
        nature: "Jolly",
        evs: { atk: 252, spe: 252 },
        item: "Life Orb",
      },
      { pokemon: "Amoonguss", level: 50, nature: "Calm", evs: { hp: 236, spd: 236 } },
      "Earthquake",
    );

    expect(result.minDamage).toBe(109);
    expect(result.maxDamage).toBe(130);
    expect(result.minPct).toBe(49.8);
    expect(result.maxPct).toBe(59.4);
    expect(result.koChance).toContain("2HKO");
    expect(result.desc).toContain("Garchomp");
  });
});

describe("CalcEngine.statAtLevel50", () => {
  const engine = new CalcEngine();

  it("Garchomp Jolly 252 Spe = 169", () => {
    expect(engine.statAtLevel50(102, 31, 252, "spe", "Jolly")).toBe(169);
  });

  it("HP no se ve afectada por la naturaleza", () => {
    // Garchomp base HP 108: 0 EV -> 183, 4 EV -> 184
    expect(engine.statAtLevel50(108, 31, 0, "hp", "Jolly")).toBe(183);
    expect(engine.statAtLevel50(108, 31, 4, "hp", "Adamant")).toBe(184);
  });

  it("coincide con @smogon/calc para varias naturalezas/stats", () => {
    const gen = Generations.get(9);
    const cases: { name: string; nature: Nature; stat: StatKey; ev: number }[] = [
      { name: "Garchomp", nature: "Jolly", stat: "spe", ev: 252 }, // +Spe
      { name: "Garchomp", nature: "Adamant", stat: "spa", ev: 0 }, // -SpA
      { name: "Amoonguss", nature: "Calm", stat: "spd", ev: 252 }, // +SpD
      { name: "Amoonguss", nature: "Calm", stat: "atk", ev: 0 }, // -Atk
      { name: "Incineroar", nature: "Careful", stat: "def", ev: 100 }, // neutra
      { name: "Amoonguss", nature: "Bold", stat: "hp", ev: 236 }, // HP
    ];

    for (const c of cases) {
      const p = new Pokemon(gen, c.name, {
        level: 50,
        nature: c.nature,
        evs: { [c.stat]: c.ev },
      });
      const base = p.species.baseStats[c.stat];
      const mine = engine.statAtLevel50(base, 31, c.ev, c.stat, c.nature);
      expect(mine, `${c.name} ${c.nature} ${c.stat}`).toBe(p.stats[c.stat]);
    }
  });
});
