import { describe, expect, it } from "vitest";

import { StaticMetaAdapter } from "@/adapters/static/staticMetaAdapter";

describe("StaticMetaAdapter", () => {
  const meta = new StaticMetaAdapter();

  it("topThreats ordena por uso y respeta el límite", () => {
    const top = meta.topThreats("M-B", 1);
    expect(top).toHaveLength(1);
    expect(top[0].pokemon).toBe("Garchomp"); // mayor usagePct en el placeholder
  });

  it("usage encuentra por nombre (case-insensitive)", () => {
    expect(meta.usage("amoonguss", "M-B")?.pokemon).toBe("Amoonguss");
  });

  it("usage devuelve null si no hay datos del Pokémon", () => {
    expect(meta.usage("Pikachu", "M-B")).toBeNull();
  });

  it("una regulación sin datos devuelve lista vacía", () => {
    expect(meta.topThreats("Z-Z")).toEqual([]);
  });
});
