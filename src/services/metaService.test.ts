import { describe, expect, it } from "vitest";

import { MetaService } from "@/services/metaService";

describe("MetaService", () => {
  const meta = new MetaService();

  it("getTopThreats ordena por uso y respeta el límite", () => {
    const top = meta.getTopThreats("M-B", 1);
    expect(top).toHaveLength(1);
    expect(top[0].pokemon).toBe("Garchomp"); // mayor usagePct en el placeholder
  });

  it("getUsage encuentra por nombre (case-insensitive)", () => {
    expect(meta.getUsage("amoonguss", "M-B").pokemon).toBe("Amoonguss");
  });

  it("getUsage lanza si no hay datos del Pokémon", () => {
    expect(() => meta.getUsage("Pikachu", "M-B")).toThrow(/sin datos/);
  });

  it("una regulación sin datos devuelve lista vacía", () => {
    expect(meta.getTopThreats("Z-Z")).toEqual([]);
  });
});
