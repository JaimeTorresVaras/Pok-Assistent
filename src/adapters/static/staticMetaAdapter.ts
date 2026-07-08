import type { Regulation, ThreatMon } from "@/core/domain/model";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";

/**
 * Adaptador estático de MetaUsagePort (dataset manual del top del meta).
 *
 * ⚠️ PLACEHOLDER: estos porcentajes son de EJEMPLO (no reales), con la forma
 * correcta, para programar y testear. Reemplazar por el top-30 real de M-B
 * (a mano al inicio; luego lo recalcula solo la ingesta de torneos, Fase 5).
 */
const META: Record<string, ThreatMon[]> = {
  "M-B": [
    {
      regulation: "M-B",
      pokemon: "Garchomp",
      usagePct: 41.2,
      moves: [
        { name: "Earthquake", pct: 88 },
        { name: "Protect", pct: 72 },
        { name: "Dragon Claw", pct: 55 },
        { name: "Swords Dance", pct: 40 },
      ],
      items: [
        { name: "Life Orb", pct: 34 },
        { name: "Clear Amulet", pct: 21 },
      ],
      abilities: [{ name: "Rough Skin", pct: 61 }],
      spreads: [{ nature: "Jolly", evs: "252 Atk / 4 Def / 252 Spe", pct: 45 }],
      teraTypes: [{ name: "Steel", pct: 30 }],
    },
    {
      regulation: "M-B",
      pokemon: "Amoonguss",
      usagePct: 33.7,
      moves: [
        { name: "Spore", pct: 91 },
        { name: "Rage Powder", pct: 84 },
        { name: "Pollen Puff", pct: 60 },
        { name: "Protect", pct: 58 },
      ],
      items: [
        { name: "Sitrus Berry", pct: 40 },
        { name: "Rocky Helmet", pct: 28 },
      ],
      abilities: [{ name: "Regenerator", pct: 96 }],
      spreads: [{ nature: "Calm", evs: "236 HP / 36 Def / 236 SpD", pct: 38 }],
      teraTypes: [{ name: "Water", pct: 22 }],
    },
  ],
};

export class StaticMetaAdapter implements MetaUsagePort {
  topThreats(regulation: Regulation, limit = 30): ThreatMon[] {
    return [...(META[regulation] ?? [])].sort((a, b) => b.usagePct - a.usagePct).slice(0, limit);
  }

  usage(pokemon: string, regulation: Regulation): ThreatMon | null {
    const target = pokemon.toLowerCase();
    return (META[regulation] ?? []).find((t) => t.pokemon.toLowerCase() === target) ?? null;
  }
}
