import { describe, expect, it } from "vitest";

import { SmogonDamageCalcAdapter } from "@/adapters/smogon/smogonDamageCalcAdapter";

describe("SmogonDamageCalcAdapter (dobles)", () => {
  const calc = new SmogonDamageCalcAdapter();

  it("Garchomp Earthquake vs Amoonguss coincide con @smogon/calc", () => {
    const result = calc.calcDamage(
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

  it("un movimiento de estado (Spore) no lanza y hace 0 de daño", () => {
    const result = calc.calcDamage(
      { pokemon: "Amoonguss", level: 50, nature: "Calm", evs: {} },
      { pokemon: "Garchomp", level: 50, nature: "Jolly", evs: {} },
      "Spore",
    );
    expect(result.maxDamage).toBe(0);
  });
});
