import { describe, expect, it } from "vitest";

import type { PokemonSet, TournamentDoc } from "@/core/domain/model";
import { computeUsageStats } from "@/core/domain/usage";

const NOW = "2026-07-09";
const TWO_WEEKS_AGO = "2026-06-25"; // exactamente una vida media (peso 0.5)

function mkSet(partial: Partial<PokemonSet>): PokemonSet {
  return {
    nature: "Jolly",
    item: "Life Orb",
    ability: "Rough Skin",
    teraType: "",
    evs: {},
    moves: ["Earthquake"],
    ...partial,
  };
}

function mkDoc(partial: Partial<TournamentDoc> & { pokemon: string }): TournamentDoc {
  return {
    id: `doc-${partial.pokemon}-${partial.tournament ?? "T"}-${partial.player ?? "P"}`,
    source: "test",
    tournament: "T",
    date: NOW,
    regulation: "M-B",
    placement: 1,
    player: "P",
    set: mkSet({}),
    teammates: [],
    text: "",
    ...partial,
  };
}

describe("computeUsageStats (decaimiento temporal)", () => {
  // Equipo A (hoy, peso 1): X + Y · Equipo B (hace 14 días, peso 0.5): X + Z
  const docs: TournamentDoc[] = [
    mkDoc({
      pokemon: "X",
      tournament: "A",
      player: "p1",
      date: NOW,
      wins: 2,
      losses: 0,
      set: mkSet({ moves: ["M1"], nature: "Jolly" }),
    }),
    mkDoc({ pokemon: "Y", tournament: "A", player: "p1", date: NOW }),
    mkDoc({
      pokemon: "X",
      tournament: "B",
      player: "p2",
      date: TWO_WEEKS_AGO,
      wins: 0,
      losses: 2,
      set: mkSet({ moves: ["M2"], nature: "Adamant" }),
    }),
    mkDoc({ pokemon: "Z", tournament: "B", player: "p2", date: TWO_WEEKS_AGO }),
  ];

  const stats = computeUsageStats(docs, { now: NOW, halfLifeDays: 14 });
  const byMon = new Map(stats.map((s) => [s.pokemon, s]));

  it("usage pondera los equipos por recencia (total 1 + 0.5)", () => {
    expect(byMon.get("X")?.usagePct).toBe(100); // en ambos equipos
    expect(byMon.get("Y")?.usagePct).toBe(66.7); // 1 / 1.5
    expect(byMon.get("Z")?.usagePct).toBe(33.3); // 0.5 / 1.5
  });

  it("ordena por uso descendente", () => {
    expect(stats[0].pokemon).toBe("X");
  });

  it("los movimientos recientes pesan más", () => {
    const moves = byMon.get("X")!.moves;
    expect(moves[0]).toEqual({ name: "M1", pct: 66.7 }); // doc de hoy
    expect(moves[1]).toEqual({ name: "M2", pct: 33.3 }); // doc viejo
  });

  it("winrate ponderado por peso del doc", () => {
    // hoy: 2W-0L peso 1 → 2/2 · viejo: 0W-2L peso 0.5 → 0/1  ⇒ 2/3
    expect(byMon.get("X")?.winratePct).toBe(66.7);
    expect(byMon.get("Y")?.winratePct).toBeUndefined(); // sin récord
  });

  it("spreads agregan la naturaleza real (sin EVs públicos)", () => {
    const spreads = byMon.get("X")!.spreads;
    expect(spreads[0]).toEqual({ nature: "Jolly", evs: "", pct: 66.7 });
    expect(spreads[1].nature).toBe("Adamant");
  });

  it("sampleSize cuenta docs sin ponderar", () => {
    expect(byMon.get("X")?.sampleSize).toBe(2);
    expect(byMon.get("Y")?.sampleSize).toBe(1);
  });

  it("lista vacía -> sin stats", () => {
    expect(computeUsageStats([], { now: NOW })).toEqual([]);
  });
});
