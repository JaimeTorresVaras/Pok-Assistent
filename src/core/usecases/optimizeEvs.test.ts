import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { SmogonDamageCalcAdapter } from "@/adapters/smogon/smogonDamageCalcAdapter";
import type { CalcMon } from "@/core/domain/model";
import { EVOptimizer, type Objective, type OptimizerMon } from "@/core/usecases/optimizeEvs";

const calc = new SmogonDamageCalcAdapter();
const opt = new EVOptimizer(new PkmnPokedexAdapter(), calc);

const garchomp: OptimizerMon = { pokemon: "Garchomp", nature: "Adamant", item: "Life Orb" };
const amoonguss: OptimizerMon = { pokemon: "Amoonguss", nature: "Calm" };

// Amoonguss "físicamente pelado" (236 HP / 0 Def) — coincide con el smoke test.
const amoonDefender: CalcMon = {
  pokemon: "Amoonguss",
  level: 50,
  nature: "Calm",
  evs: { hp: 236, spd: 236 },
};
const jollyChompAttacker: CalcMon = {
  pokemon: "Garchomp",
  level: 50,
  nature: "Jolly",
  item: "Life Orb",
  evs: { atk: 252, spe: 252 },
};

describe("EVOptimizer — velocidad (fórmula pura, EVs exactos)", () => {
  it("no gasta EVs si ya supera el objetivo", () => {
    // Garchomp base Spe 102, Adamant no afecta Spe -> 122 con 0 EVs.
    const r = opt.optimize(garchomp, [{ kind: "outspeed", priority: 1, targetSpeed: 100 }], {
      dumpStat: "atk",
    });
    const spe = r.met.find((m) => m.objective.kind === "outspeed");
    expect(spe?.evsSpent).toBe(0);
  });

  it("gasta los EVs mínimos para superar por poco (122 -> 4 EVs)", () => {
    const r = opt.optimize(garchomp, [{ kind: "outspeed", priority: 1, targetSpeed: 122 }], {
      dumpStat: "atk",
    });
    expect(r.evs.spe).toBe(4);
  });

  it("marca inalcanzable un objetivo imposible", () => {
    const r = opt.optimize(garchomp, [{ kind: "outspeed", priority: 1, targetSpeed: 999 }], {
      dumpStat: "atk",
    });
    expect(r.unmet).toHaveLength(1);
    expect(r.evs.spe).toBeUndefined(); // 0 -> omitido por clean()
  });
});

describe("EVOptimizer — daño (vía DamageCalcPort) + verificación", () => {
  it("2HKO alcanzable a Amoonguss: lo cumple y se re-verifica", () => {
    const r = opt.optimize(
      garchomp,
      [{ kind: "2hko", priority: 1, investIn: "atk", defender: amoonDefender, move: "Earthquake" }],
      { dumpStat: "spe" },
    );
    expect(r.met.some((m) => m.objective.kind === "2hko")).toBe(true);

    const res = calc.calcDamage(
      {
        pokemon: "Garchomp",
        level: 50,
        nature: "Adamant",
        item: "Life Orb",
        evs: { atk: r.evs.atk ?? 0 },
      },
      amoonDefender,
      "Earthquake",
    );
    expect(res.minPct).toBeGreaterThanOrEqual(50);
  });

  it("OHKO a Amoonguss NO es alcanzable: queda en unmet", () => {
    const r = opt.optimize(garchomp, [
      { kind: "ohko", priority: 1, investIn: "atk", defender: amoonDefender, move: "Earthquake" },
    ]);
    expect(r.unmet.some((m) => m.objective.kind === "ohko")).toBe(true);
    expect(r.evs.atk).toBeUndefined();
  });

  it("sobrevivir el Earthquake de Garchomp: Amoonguss lo cumple y se re-verifica", () => {
    const r = opt.optimize(
      amoonguss,
      [
        {
          kind: "survive",
          priority: 1,
          investIn: "hp",
          attacker: jollyChompAttacker,
          move: "Earthquake",
        },
      ],
      { dumpStat: "spd" },
    );
    expect(r.met.some((m) => m.objective.kind === "survive")).toBe(true);

    const res = calc.calcDamage(
      jollyChompAttacker,
      { pokemon: "Amoonguss", level: 50, nature: "Calm", evs: { hp: r.evs.hp ?? 0 } },
      "Earthquake",
    );
    expect(res.maxPct).toBeLessThan(100);
  });
});

describe("EVOptimizer — presupuesto y prioridad", () => {
  it("respeta 252 por stat y 508 total, y prioriza al de mayor prioridad", () => {
    const objectives: Objective[] = [
      { kind: "outspeed", priority: 10, targetSpeed: 122 }, // barato (4 EVs), gana
      { kind: "outspeed", priority: 1, targetSpeed: 999 }, // imposible
    ];
    const r = opt.optimize(garchomp, objectives, { dumpStat: "atk" });

    expect(r.totalEvs).toBeLessThanOrEqual(508);
    for (const s of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
      expect(r.evs[s] ?? 0).toBeLessThanOrEqual(252);
    }
    expect(r.met.some((m) => m.objective.kind === "outspeed" && m.evsSpent === 4)).toBe(true);
    expect(r.unmet).toHaveLength(1);
  });
});
