import postgres from "postgres";

import type { Regulation, ThreatMon, UsageEntry, UsageSpread } from "@/core/domain/model";
import type { MetaUsagePort } from "@/core/ports/metaUsagePort";

type Sql = ReturnType<typeof postgres>;

/** jsonb puede llegar como objeto o como string según el driver/columna. */
function jsonb<T>(value: unknown, empty: T): T {
  if (value == null) return empty;
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

/** Fila de usage_stats -> ThreatMon del dominio. */
export function rowToThreat(row: Record<string, unknown>): ThreatMon {
  return {
    regulation: String(row.regulation),
    pokemon: String(row.pokemon),
    usagePct: Number(row.usage_pct),
    winratePct: row.winrate_pct == null ? undefined : Number(row.winrate_pct),
    moves: jsonb<UsageEntry[]>(row.moves, []),
    items: jsonb<UsageEntry[]>(row.items, []),
    abilities: jsonb<UsageEntry[]>(row.abilities, []),
    spreads: jsonb<UsageSpread[]>(row.spreads, []),
    teraTypes: jsonb<UsageEntry[]>(row.tera_types, []),
  };
}

/** El usage solo cambia cuando corre la ingesta (cron diario). */
const DEFAULT_TTL_MS = 5 * 60_000;

/**
 * Adaptador de MetaUsagePort sobre la tabla usage_stats (Railway Postgres),
 * que la ingesta de torneos (Fase 5) recalcula con decaimiento temporal:
 * el "meta vivo".
 *
 * - Caché en memoria por regulación (TTL) para no golpear la DB en cada
 *   render/recomendación.
 * - `fallback` opcional (el adaptador estático): se usa si la DB falla o
 *   aún no tiene datos para la regulación, así la app nunca queda en blanco.
 */
export class PgMetaAdapter implements MetaUsagePort {
  private readonly sql: Sql;
  private readonly fallback?: MetaUsagePort;
  private readonly ttlMs: number;
  private readonly cache = new Map<Regulation, { at: number; threats: ThreatMon[] }>();

  constructor(databaseUrl: string, opts: { fallback?: MetaUsagePort; ttlMs?: number } = {}) {
    if (!databaseUrl) throw new Error("PgMetaAdapter: falta DATABASE_URL.");
    this.sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
    this.fallback = opts.fallback;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  }

  async topThreats(regulation: Regulation, limit = 30): Promise<ThreatMon[]> {
    const threats = await this.load(regulation);
    if (threats === null || threats.length === 0) {
      return this.fallback ? this.fallback.topThreats(regulation, limit) : [];
    }
    return threats.slice(0, limit);
  }

  async usage(pokemon: string, regulation: Regulation): Promise<ThreatMon | null> {
    const threats = await this.load(regulation);
    if (threats === null || threats.length === 0) {
      return this.fallback ? this.fallback.usage(pokemon, regulation) : null;
    }
    const target = pokemon.toLowerCase();
    return threats.find((t) => t.pokemon.toLowerCase() === target) ?? null;
  }

  /** Todas las filas de la regulación (caché TTL); null si la consulta falla. */
  private async load(regulation: Regulation): Promise<ThreatMon[] | null> {
    const hit = this.cache.get(regulation);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.threats;

    try {
      const rows = await this.sql`
        select regulation, pokemon, usage_pct, winrate_pct,
               moves, items, abilities, spreads, tera_types
        from usage_stats
        where regulation = ${regulation}
        order by usage_pct desc, pokemon
      `;
      const threats = rows.map((row) => rowToThreat(row));
      this.cache.set(regulation, { at: Date.now(), threats });
      return threats;
    } catch (error) {
      console.warn("PgMetaAdapter: fallo leyendo usage_stats; se usa el fallback.", error);
      return null;
    }
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
