import { describe, expect, it } from "vitest";

import { DexService } from "@/services/dexService";

describe("DexService", () => {
  const dex = new DexService();

  it("devuelve las stats base reales de Garchomp", () => {
    expect(dex.getBaseStats("Garchomp")).toEqual({
      hp: 108,
      atk: 130,
      def: 95,
      spa: 80,
      spd: 85,
      spe: 102,
    });
  });

  it("normaliza el nombre al buscar (garchomp / GARCHOMP)", () => {
    expect(dex.getBaseStats("garchomp").atk).toBe(130);
    expect(dex.getBaseStats("GARCHOMP").spe).toBe(102);
  });

  it("devuelve los tipos", () => {
    expect(dex.getTypes("Garchomp")).toEqual(["Dragon", "Ground"]);
  });

  it("lanza con un Pokémon inexistente", () => {
    expect(() => dex.getBaseStats("NoExiste-Fake")).toThrow(/desconocido/);
  });

  it("aplica la allowlist de M-B", () => {
    expect(dex.isLegal("Garchomp", "M-B")).toBe(true);
    expect(dex.isLegal("Landorus-Therian", "M-B")).toBe(true); // nombre con guion
    expect(dex.isLegal("Mewtwo", "M-B")).toBe(false); // existe pero no está permitido
    expect(dex.isLegal("NoExiste-Fake", "M-B")).toBe(false); // ni siquiera existe
  });

  it("getLearnset incluye movimientos legales en gen 9 (con prevos)", async () => {
    const moves = await dex.getLearnset("Garchomp");
    expect(moves).toContain("Earthquake");
    expect(moves.length).toBeGreaterThan(50);
  });
});
