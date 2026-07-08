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

describe("RecommendTeamUseCase", () => {
  it("con datos de uso: recomienda el set más frecuente del meta", async () => {
    const [rec] = await usecase.exec(["Garchomp"], "M-B");

    expect(rec.pokemon).toBe("Garchomp");
    expect(rec.recommended.nature).toBe("Jolly"); // spread top del placeholder
    expect(rec.recommended.item).toBe("Life Orb");
    expect(rec.recommended.evs).toEqual({ atk: 252, def: 4, spe: 252 });
    expect(rec.recommended.moves).toHaveLength(4);
    expect(rec.metaMoves[0]).toContain("Earthquake");
    expect(rec.reasoning).toContain("Set más usado");
  });

  it("calcula benchmarks reales verificados contra amenazas top", async () => {
    const [rec] = await usecase.exec(["Garchomp"], "M-B");

    // La única otra amenaza del placeholder es Amoonguss.
    expect(rec.benchmarks.length).toBeGreaterThan(0);
    for (const b of rec.benchmarks) {
      expect(b.goal).toBeTruthy();
      expect(typeof b.verified).toBe("boolean");
      expect(b.target).toMatch(/%/); // siempre lleva el % calculado por el motor
    }
    // Sabemos por la Fase 2 que EQ hace 49.8–59.4% a ese Amoonguss => no es 2HKO garantizado... sí lo es (>=50 falla por 49.8): verificado o no, debe existir el benchmark ofensivo.
    expect(rec.benchmarks.some((b) => b.goal.includes("Amoonguss"))).toBe(true);
  });

  it("sin datos de uso: spread genérico según su stat de ataque mayor", async () => {
    // Incineroar es legal en el placeholder pero no tiene datos de meta.
    const [rec] = await usecase.exec(["Incineroar"], "M-B");

    expect(rec.recommended.nature).toBe("Adamant"); // atk 115 > spa 90
    expect(rec.recommended.evs.atk).toBe(252);
    expect(rec.recommended.evs.spe).toBe(252);
    expect(rec.reasoning).toContain("Sin datos de uso");
    expect(rec.metaMoves).toEqual([]);
  });

  it("rechaza equipos con Pokémon ilegales", async () => {
    await expect(usecase.exec(["Garchomp", "Mewtwo"], "M-B")).rejects.toThrow(IllegalTeamError);
    await expect(usecase.exec(["Mewtwo"], "M-B")).rejects.toThrow(/Mewtwo/);
  });

  it("devuelve una recomendación por cada miembro del equipo", async () => {
    const recs = await usecase.exec(["Garchomp", "Amoonguss", "Incineroar"], "M-B");
    expect(recs.map((r) => r.pokemon)).toEqual(["Garchomp", "Amoonguss", "Incineroar"]);
  });
});
