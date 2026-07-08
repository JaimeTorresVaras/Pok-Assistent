import { Generations, Pokemon } from "@smogon/calc";
import { describe, expect, it } from "vitest";

import type { Nature, StatKey } from "@/core/domain/model";
import { statAtLevel50 } from "@/core/domain/stats";

describe("statAtLevel50 (fórmula pura de dominio)", () => {
  it("Garchomp Jolly 252 Spe = 169", () => {
    expect(statAtLevel50(102, 31, 252, "spe", "Jolly")).toBe(169);
  });

  it("HP no se ve afectada por la naturaleza", () => {
    // Garchomp base HP 108: 0 EV -> 183, 4 EV -> 184
    expect(statAtLevel50(108, 31, 0, "hp", "Jolly")).toBe(183);
    expect(statAtLevel50(108, 31, 4, "hp", "Adamant")).toBe(184);
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
      const mine = statAtLevel50(base, 31, c.ev, c.stat, c.nature);
      expect(mine, `${c.name} ${c.nature} ${c.stat}`).toBe(p.stats[c.stat]);
    }
  });
});
