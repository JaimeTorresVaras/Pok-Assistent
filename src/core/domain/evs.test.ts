import { describe, expect, it } from "vitest";

import { formatShowdownEvs, parseShowdownEvs, toShowdownSet, totalEvs } from "@/core/domain/evs";

describe("parseShowdownEvs / formatShowdownEvs", () => {
  it("parsea un spread ofensivo", () => {
    expect(parseShowdownEvs("252 Atk / 4 Def / 252 Spe")).toEqual({
      atk: 252,
      def: 4,
      spe: 252,
    });
  });

  it("parsea un spread defensivo con SpD", () => {
    expect(parseShowdownEvs("236 HP / 36 Def / 236 SpD")).toEqual({
      hp: 236,
      def: 36,
      spd: 236,
    });
  });

  it("acepta alias con puntos y espacios (Sp. Def, Speed)", () => {
    expect(parseShowdownEvs("4 Sp. Def / 12 Speed")).toEqual({ spd: 4, spe: 12 });
  });

  it("formatea en orden canónico HP/Atk/Def/SpA/SpD/Spe", () => {
    expect(formatShowdownEvs({ spe: 252, hp: 4, atk: 252 })).toBe("4 HP / 252 Atk / 252 Spe");
  });

  it("roundtrip parse -> format", () => {
    const spread = "236 HP / 36 Def / 236 SpD";
    expect(formatShowdownEvs(parseShowdownEvs(spread))).toBe(spread);
  });

  it("totalEvs suma el reparto", () => {
    expect(totalEvs({ atk: 252, def: 4, spe: 252 })).toBe(508);
  });
});

describe("toShowdownSet", () => {
  it("exporta el formato completo de Showdown", () => {
    const text = toShowdownSet({
      pokemon: "Garchomp",
      item: "Life Orb",
      ability: "Rough Skin",
      teraType: "Steel",
      nature: "Jolly",
      evs: { atk: 252, hp: 4, spe: 252 },
      moves: ["Earthquake", "Dragon Claw", "Protect", "Swords Dance"],
    });

    expect(text).toBe(
      [
        "Garchomp @ Life Orb",
        "Ability: Rough Skin",
        "Level: 50",
        "Tera Type: Steel",
        "EVs: 4 HP / 252 Atk / 252 Spe",
        "Jolly Nature",
        "- Earthquake",
        "- Dragon Claw",
        "- Protect",
        "- Swords Dance",
      ].join("\n"),
    );
  });

  it("omite ítem/habilidad/tera cuando faltan", () => {
    const text = toShowdownSet({
      pokemon: "Amoonguss",
      nature: "Calm",
      evs: { hp: 236 },
      moves: ["Spore"],
    });
    expect(text).toContain("Amoonguss\n");
    expect(text).not.toContain("@");
    expect(text).not.toContain("Ability:");
    expect(text).not.toContain("Tera Type:");
  });
});
