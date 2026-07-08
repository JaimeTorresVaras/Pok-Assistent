import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import { LegalityService } from "@/core/usecases/legality";

describe("LegalityService (allowlist real de M-B: roster de Champions)", () => {
  const legality = new LegalityService(new PkmnPokedexAdapter(), new StaticRegulationData());

  it("acepta Pokémon del roster", () => {
    expect(legality.isLegal("Garchomp", "M-B")).toBe(true);
    expect(legality.isLegal("Sinistcha", "M-B")).toBe(true);
    // Staraptor no está en los juegos de gen 9 ("Past"), pero sí en Champions.
    expect(legality.isLegal("Staraptor", "M-B")).toBe(true);
  });

  it("acepta megas/formas vía su especie base", () => {
    expect(legality.isLegal("Charizard-Mega-Y", "M-B")).toBe(true);
  });

  it("rechaza Pokémon fuera del roster de Champions", () => {
    expect(legality.isLegal("Amoonguss", "M-B")).toBe(false); // existe en gen 9, no en Champions
    expect(legality.isLegal("Mewtwo", "M-B")).toBe(false);
    expect(legality.isLegal("NoExiste-Fake", "M-B")).toBe(false);
  });

  it("una regulación sin datos no permite nada", () => {
    expect(legality.isLegal("Garchomp", "Z-Z")).toBe(false);
  });

  it("listLegal devuelve las 209 especies del roster, ordenadas", () => {
    const legal = legality.listLegal("M-B");
    expect(legal).toContain("Garchomp");
    expect(legal).toContain("Vileplume"); // novedad de M-B
    expect(legal).toHaveLength(209);
    expect([...legal].sort()).toEqual(legal);
  });
});
