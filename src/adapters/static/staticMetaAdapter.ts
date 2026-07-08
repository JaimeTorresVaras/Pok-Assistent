import metaMB from "./data/meta-mb.json";

import type { Regulation, ThreatMon, UsageEntry } from "@/core/domain/model";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";

/** Forma de cada amenaza en el JSON generado desde las fuentes. */
interface RawThreat {
  pokemon: string;
  usagePct: number;
  winratePct?: number;
  moves: UsageEntry[];
  items: UsageEntry[];
  abilities: UsageEntry[];
}

/**
 * Adaptador estático de MetaUsagePort con datos REALES del meta.
 *
 * Fuente M-B: Pikalytics — torneos Reg M-B (Limitless, últimas 4 semanas);
 * ver `source` y `retrievedAt` en data/meta-mb.json. Incluye uso %, winrate y
 * movimientos/ítems/habilidades con su % real.
 *
 * Limitación conocida: las fuentes públicas no exponen (server-side) los
 * spreads de EVs/naturalezas de Champions, así que `spreads` va vacío y el
 * caso de uso deriva un spread genérico de las stats base. La ingesta de
 * team pastes (Fase 5) lo completará.
 */
const THREATS_BY_REG: Record<string, ThreatMon[]> = {
  [metaMB.regulation]: (metaMB.threats as RawThreat[]).map((t) => ({
    regulation: metaMB.regulation,
    pokemon: t.pokemon,
    usagePct: t.usagePct,
    winratePct: t.winratePct,
    moves: t.moves,
    items: t.items,
    abilities: t.abilities,
    spreads: [],
    teraTypes: [],
  })),
};

export class StaticMetaAdapter implements MetaUsagePort {
  topThreats(regulation: Regulation, limit = 30): ThreatMon[] {
    return [...(THREATS_BY_REG[regulation] ?? [])]
      .sort((a, b) => b.usagePct - a.usagePct)
      .slice(0, limit);
  }

  usage(pokemon: string, regulation: Regulation): ThreatMon | null {
    const target = pokemon.toLowerCase();
    return (
      (THREATS_BY_REG[regulation] ?? []).find((t) => t.pokemon.toLowerCase() === target) ?? null
    );
  }
}
