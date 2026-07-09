import postgres from "postgres";

import type { Regulation, TournamentDoc, UsageStats } from "@/core/domain/model";
import type {
  EmbeddingRecord,
  SimilaritySearch,
  TournamentStorePort,
} from "@/core/ports/tournamentStorePort";

type Sql = ReturnType<typeof postgres>;

/** Literal pgvector: [0.1,0.2,...] (se castea con ::vector en el SQL). */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** Fila de tournament_teams -> TournamentDoc del dominio. */
export function rowToDoc(row: Record<string, unknown>): TournamentDoc {
  const set = row.set;
  return {
    id: String(row.id),
    source: String(row.source),
    tournament: String(row.tournament),
    date: String(row.date),
    regulation: String(row.regulation),
    placement: Number(row.placement),
    player: String(row.player ?? ""),
    pokemon: String(row.pokemon),
    set: (typeof set === "string" ? JSON.parse(set) : set) as TournamentDoc["set"],
    teammates: (row.teammates ?? []) as string[],
    wins: row.wins == null ? undefined : Number(row.wins),
    losses: row.losses == null ? undefined : Number(row.losses),
    text: String(row.doc_text),
  };
}

/** TournamentDoc del dominio -> fila insertable (sin embedding). */
export function docToRow(doc: TournamentDoc) {
  return {
    id: doc.id,
    source: doc.source,
    tournament: doc.tournament,
    date: doc.date,
    regulation: doc.regulation,
    placement: doc.placement,
    player: doc.player,
    pokemon: doc.pokemon,
    set: doc.set, // se envuelve con sql.json() al insertar (jsonb real, no string)
    teammates: doc.teammates,
    wins: doc.wins ?? null,
    losses: doc.losses ?? null,
    doc_text: doc.text,
  };
}

const DOC_COLUMNS = `id, source, tournament, date::text as date, regulation,
             placement, player, pokemon, set, teammates, wins, losses, doc_text`;

/**
 * Adaptador de TournamentStorePort sobre Postgres + pgvector (Railway).
 * Esquema en db/migrations/. `prepare: false` para ser compatible con
 * poolers tipo PgBouncer si los hubiera.
 */
export class PgTournamentStore implements TournamentStorePort {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    if (!databaseUrl) throw new Error("PgTournamentStore: falta DATABASE_URL.");
    this.sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
  }

  /** sql.json con cast: nuestras interfaces no traen la index signature que pide porsager. */
  private json(value: unknown) {
    return this.sql.json(value as never);
  }

  async upsertDocs(docs: TournamentDoc[]): Promise<void> {
    if (docs.length === 0) return;
    // sql.json marca el valor como jsonb real (sin él, porsager lo doble-encodea).
    const rows = docs.map((d) => ({ ...docToRow(d), set: this.json(docToRow(d).set) }));
    await this.sql`
      insert into tournament_teams ${this.sql(rows)}
      on conflict (id) do update set
        source = excluded.source,
        tournament = excluded.tournament,
        date = excluded.date,
        regulation = excluded.regulation,
        placement = excluded.placement,
        player = excluded.player,
        pokemon = excluded.pokemon,
        set = excluded.set,
        teammates = excluded.teammates,
        wins = excluded.wins,
        losses = excluded.losses,
        doc_text = excluded.doc_text
    `;
  }

  async upsertEmbeddings(records: EmbeddingRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.sql.begin(async (sql) => {
      for (const r of records) {
        await sql`
          insert into doc_embeddings (doc_id, embedding, embedding_model)
          values (${r.docId}, ${toVectorLiteral(r.embedding)}::vector, ${r.model})
          on conflict (doc_id) do update set
            embedding = excluded.embedding,
            embedding_model = excluded.embedding_model,
            created_at = now()
        `;
      }
    });
  }

  async similaritySearch(query: SimilaritySearch): Promise<TournamentDoc[]> {
    const k = query.k ?? 5;
    const rows = await this.sql`
      select tt.id, tt.source, tt.tournament, tt.date::text as date, tt.regulation,
             tt.placement, tt.player, tt.pokemon, tt.set, tt.teammates, tt.wins,
             tt.losses, tt.doc_text
      from doc_embeddings de
      join tournament_teams tt on tt.id = de.doc_id
      where tt.regulation = ${query.regulation}
      ${query.pokemon ? this.sql`and tt.pokemon = ${query.pokemon}` : this.sql``}
      ${query.since ? this.sql`and tt.date >= ${query.since}` : this.sql``}
      order by de.embedding <=> ${toVectorLiteral(query.vector)}::vector
      limit ${k}
    `;
    return rows.map((row) => rowToDoc(row));
  }

  async embeddedDocIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.sql`
      select doc_id from doc_embeddings where doc_id = any(${ids})
    `;
    return new Set(rows.map((r) => String(r.doc_id)));
  }

  async listDocs(regulation: Regulation, since?: string): Promise<TournamentDoc[]> {
    const rows = await this.sql`
      select ${this.sql.unsafe(DOC_COLUMNS)}
      from tournament_teams
      where regulation = ${regulation}
      ${since ? this.sql`and date >= ${since}` : this.sql``}
      order by date desc, id
    `;
    return rows.map((row) => rowToDoc(row));
  }

  async replaceUsageStats(regulation: Regulation, rows: UsageStats[]): Promise<void> {
    await this.sql.begin(async (sql) => {
      const json = (value: unknown) => sql.json(value as never);
      await sql`delete from usage_stats where regulation = ${regulation}`;
      for (const r of rows) {
        await sql`
          insert into usage_stats
            (regulation, pokemon, usage_pct, winrate_pct, moves, items, abilities,
             spreads, tera_types, sample_size, computed_at)
          values
            (${regulation}, ${r.pokemon}, ${r.usagePct}, ${r.winratePct ?? null},
             ${json(r.moves)}, ${json(r.items)},
             ${json(r.abilities)}, ${json(r.spreads)},
             ${json(r.teraTypes)}, ${r.sampleSize}, now())
        `;
      }
    });
  }

  async getState(key: string): Promise<unknown | null> {
    const rows = await this.sql`select value from ingest_state where key = ${key}`;
    if (rows.length === 0) return null;
    const value = rows[0].value;
    return typeof value === "string" ? JSON.parse(value) : value;
  }

  async setState(key: string, value: unknown): Promise<void> {
    await this.sql`
      insert into ingest_state (key, value)
      values (${key}, ${this.json(value)})
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
