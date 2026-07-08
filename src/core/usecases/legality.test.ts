import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import { LegalityService } from "@/core/usecases/legality";

describe("LegalityService", () => {
  const legality = new LegalityService(new PkmnPokedexAdapter(), new StaticRegulationData());

  it("aplica la allowlist de M-B", () => {
    expect(legality.isLegal("Garchomp", "M-B")).toBe(true);
    expect(legality.isLegal("Landorus-Therian", "M-B")).toBe(true); // nombre con guion
    expect(legality.isLegal("Mewtwo", "M-B")).toBe(false); // existe pero no está permitido
    expect(legality.isLegal("NoExiste-Fake", "M-B")).toBe(false); // ni siquiera existe
  });

  it("una regulación sin datos no permite nada", () => {
    expect(legality.isLegal("Garchomp", "Z-Z")).toBe(false);
  });

  it("listLegal devuelve nombres canónicos ordenados", () => {
    const legal = legality.listLegal("M-B");
    expect(legal).toContain("Garchomp");
    expect(legal).toContain("Landorus-Therian");
    expect(legal).toHaveLength(15); // tamaño del placeholder
    expect([...legal].sort()).toEqual(legal);
  });
});
