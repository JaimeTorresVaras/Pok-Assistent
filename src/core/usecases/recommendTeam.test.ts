import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { SmogonDamageCalcAdapter } from "@/adapters/smogon/smogonDamageCalcAdapter";
import { StaticMetaAdapter } from "@/adapters/static/staticMetaAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import { LegalityService } from "@/core/usecases/legality";
import { IllegalTeamError, RecommendTeamUseCase } from "@/core/usecases/recommendTeam";

const pokedex = new PkmnPokedexAdapter();
const meta = new StaticMetaAdapter();
const calc = new SmogonDamageCalcAdapter();
const legality = new LegalityService(pokedex, new StaticRegulationData());
const usecase = new RecommendTeamUseCase({ pokedex, meta, calc, legality });

describe("RecommendTeamUseCase (datos reales M-B)", () => {
  it("con datos de uso: ítem/habilidad/movimientos reales del meta", async () => {
    const [rec] = await usecase.exec(["Garchomp"], "M-B");

    expect(rec.pokemon).toBe("Garchomp");
    expect(rec.recommended.item).toBe("Life Orb"); // 67.6% real
    expect(rec.recommended.ability).toBe("Rough Skin"); // 94.9% real
    expect(rec.recommended.moves).toContain("Earthquake");
    expect(rec.recommended.moves).toHaveLength(4);
    expect(rec.metaMoves[0]).toMatch(/%$/); // "Dragon Claw 92.6%"
  });

  it("sin spreads públicos: deriva el spread de las stats base y lo declara", async () => {
    const [rec] = await usecase.exec(["Garchomp"], "M-B");

    // Garchomp: atk 130 > spa 80 -> físico
    expect(rec.recommended.nature).toBe("Adamant");
    expect(rec.recommended.evs.atk).toBe(252);
    expect(rec.recommended.evs.spe).toBe(252);
    expect(rec.reasoning).toContain("derivado de sus stats base");
  });

  it("calcula benchmarks reales verificados contra amenazas top", async () => {
    const [rec] = await usecase.exec(["Garchomp"], "M-B");

    expect(rec.benchmarks.length).toBeGreaterThan(0);
    for (const b of rec.benchmarks) {
      expect(b.goal).toBeTruthy();
      expect(typeof b.verified).toBe("boolean");
      expect(b.target).toMatch(/%/); // siempre lleva el % calculado por el motor
    }
    // Sinistcha (amenaza #2 real) debe aparecer en algún benchmark.
    expect(rec.benchmarks.some((b) => b.goal.includes("Sinistcha"))).toBe(true);
  });

  it("legal pero fuera del top: spread genérico según su stat de ataque mayor", async () => {
    // Vileplume es del roster (novedad M-B) pero no está en el top de uso.
    const [rec] = await usecase.exec(["Vileplume"], "M-B");

    expect(rec.recommended.nature).toBe("Modest"); // spa 110 > atk 80
    expect(rec.recommended.evs.spa).toBe(252);
    expect(rec.reasoning).toContain("Sin datos de uso");
    expect(rec.metaMoves).toEqual([]);
  });

  it("rechaza equipos con Pokémon fuera del roster de Champions", async () => {
    await expect(usecase.exec(["Garchomp", "Amoonguss"], "M-B")).rejects.toThrow(IllegalTeamError);
    await expect(usecase.exec(["Amoonguss"], "M-B")).rejects.toThrow(/Amoonguss/);
  });

  it("devuelve una recomendación por cada miembro, en orden", async () => {
    const recs = await usecase.exec(["Garchomp", "Sinistcha", "Vileplume"], "M-B");
    expect(recs.map((r) => r.pokemon)).toEqual(["Garchomp", "Sinistcha", "Vileplume"]);
  });
});
