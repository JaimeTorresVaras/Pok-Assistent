import postgres from "postgres";

import type { TournamentDoc } from "@/core/domain/model";
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
    set: JSON.stringify(doc.set), // Postgres castea el string a jsonb al insertar
    teammates: doc.teammates,
    doc_text: doc.text,
  };
}

/**
 * Adaptador de TournamentStorePort sobre Postgres + pgvector (Supabase).
 * Esquema en db/migrations/. `prepare: false` para ser compatible con el
 * transaction pooler de Supabase (PgBouncer).
 */
export class PgTournamentStore implements TournamentStorePort {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    if (!databaseUrl) throw new Error("PgTournamentStore: falta DATABASE_URL.");
    this.sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
  }

  async upsertDocs(docs: TournamentDoc[]): Promise<void> {
    if (docs.length === 0) return;
    const rows = docs.map(docToRow);
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
             tt.placement, tt.player, tt.pokemon, tt.set, tt.teammates, tt.doc_text
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

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
