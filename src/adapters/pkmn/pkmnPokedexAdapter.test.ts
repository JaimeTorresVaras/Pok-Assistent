import { describe, expect, it } from "vitest";

import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";

describe("PkmnPokedexAdapter", () => {
  const dex = new PkmnPokedexAdapter();

  it("devuelve la especie real de Garchomp (stats, tipos, habilidades)", () => {
    const s = dex.getSpecies("Garchomp");
    expect(s?.name).toBe("Garchomp");
    expect(s?.id).toBe("garchomp");
    expect(s?.baseStats).toEqual({ hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 });
    expect(s?.types).toEqual(["Dragon", "Ground"]);
    expect(s?.abilities).toContain("Rough Skin");
  });

  it("normaliza el nombre al buscar (garchomp / GARCHOMP / id)", () => {
    expect(dex.getSpecies("garchomp")?.name).toBe("Garchomp");
    expect(dex.getSpecies("GARCHOMP")?.name).toBe("Garchomp");
    expect(dex.getSpecies("landorustherian")?.name).toBe("Landorus-Therian");
  });

  it("devuelve null con un Pokémon inexistente", () => {
    expect(dex.getSpecies("NoExiste-Fake")).toBeNull();
  });

  it("resuelve Pokémon 'Past' (fuera de gen 9 pero en Champions)", () => {
    expect(dex.getSpecies("Staraptor")?.name).toBe("Staraptor");
    expect(dex.getSpecies("Aerodactyl")?.name).toBe("Aerodactyl");
  });

  it("resuelve megas y expone la especie base", () => {
    const mega = dex.getSpecies("Charizard-Mega-Y");
    expect(mega?.name).toBe("Charizard-Mega-Y");
    expect(mega?.baseSpeciesId).toBe("charizard");
    // Un no-forma tiene baseSpeciesId igual a su propio id.
    expect(dex.getSpecies("Garchomp")?.baseSpeciesId).toBe("garchomp");
  });

  it("getLearnset incluye movimientos legales en gen 9 (con prevos)", async () => {
    const moves = await dex.getLearnset("Garchomp");
    expect(moves).toContain("Earthquake");
    expect(moves.length).toBeGreaterThan(50);
  });

  it("getLearnset lanza con un Pokémon inexistente", async () => {
    await expect(dex.getLearnset("NoExiste-Fake")).rejects.toThrow(/desconocido/);
  });
});
