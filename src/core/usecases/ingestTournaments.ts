import { toID } from "@/core/domain/ids";
import type { PokemonSet, Regulation, TournamentDoc } from "@/core/domain/model";
import { computeUsageStats } from "@/core/domain/usage";
import type { EmbeddingsPort } from "@/core/ports/embeddingsPort";
import type { RegulationDataPort } from "@/core/ports/regulationDataPort";
import type {
  SourceTeam,
  SourceTournament,
  TournamentSourcePort,
} from "@/core/ports/tournamentSourcePort";
import type { TournamentStorePort } from "@/core/ports/tournamentStorePort";

import type { LegalityService } from "./legality";

export interface IngestDeps {
  source: TournamentSourcePort;
  store: TournamentStorePort;
  embeddings: EmbeddingsPort;
  legality: LegalityService;
  regulations: RegulationDataPort;
}

export interface IngestOptions {
  regulation: Regulation;
  /** Fecha "hoy" ISO (inyectada para determinismo). */
  now: string;
  /** Torneos nuevos a procesar por corrida (default 3). */
  maxTournaments?: number;
  /** Solo equipos hasta este puesto (default 16 = top cut típico). */
  maxPlacement?: number;
  /** Ventana de días para el recálculo de usage (default 45). */
  usageWindowDays?: number;
  /** Vida media del decaimiento temporal en días (default 14). */
  halfLifeDays?: number;
}

export interface IngestSummary {
  tournamentsProcessed: string[];
  teams: number;
  docsUpserted: number;
  docsEmbedded: number;
  monsSkipped: string[];
  usageRows: number;
}

/**
 * Caso de uso: pipeline de ingesta de torneos (PLAN.md §6, Fase 5).
 *
 *   fetch → parse → validar legalidad → upsert docs → embeder SOLO los nuevos
 *   → recalcular usage con decaimiento temporal → actualizar marca de agua
 *
 * Idempotente: los torneos ya procesados se saltan (ingest_state) y los
 * upserts son por id, así que re-correr no duplica nada.
 */
export class IngestTournamentsUseCase {
  constructor(private readonly deps: IngestDeps) {}

  async exec(opts: IngestOptions): Promise<IngestSummary> {
    const { source, store, embeddings } = this.deps;
    const maxTournaments = opts.maxTournaments ?? 3;
    const stateKey = `ingest:limitless:${opts.regulation}:processed`;

    // 1. Torneos nuevos (marca de agua: solo lo no procesado).
    const processed = new Set(((await store.getState(stateKey)) as string[] | null) ?? []);
    const recent = await source.listRecent();
    const todo = recent.filter((t) => !processed.has(t.slug)).slice(0, maxTournaments);

    // 2. Bajar equipos y construir documentos (validando legalidad).
    const docsById = new Map<string, TournamentDoc>();
    const skipped = new Set<string>();
    let teams = 0;
    for (const tournament of todo) {
      const fetched = await source.fetchTeams(tournament, {
        maxPlacement: opts.maxPlacement ?? 16,
      });
      teams += fetched.length;
      for (const team of fetched) {
        for (const { pokemon, set } of team.sets) {
          if (!this.isAllowed(pokemon, opts.regulation)) {
            skipped.add(pokemon);
            continue;
          }
          const doc = buildDoc(tournament, team, pokemon, set, opts.regulation);
          docsById.set(doc.id, doc);
        }
      }
    }
    const docs = [...docsById.values()];

    // 3. Upsert de docs; embeddings SOLO para los que no tienen vector aún
    //    (ahorra coste y permite reanudar una corrida que falló a medias).
    await store.upsertDocs(docs);
    const embedded = await store.embeddedDocIds(docs.map((d) => d.id));
    const newDocs = docs.filter((d) => !embedded.has(d.id));
    if (newDocs.length > 0) {
      const vectors = await embeddings.embedDocuments(newDocs.map((d) => d.text));
      await store.upsertEmbeddings(
        newDocs.map((d, i) => ({ docId: d.id, embedding: vectors[i], model: embeddings.model })),
      );
    }

    // 4. Recalcular usage sobre la ventana reciente (con decaimiento).
    const since = isoDaysAgo(opts.now, opts.usageWindowDays ?? 45);
    const corpus = await store.listDocs(opts.regulation, since);
    const usage = computeUsageStats(corpus, {
      now: opts.now,
      halfLifeDays: opts.halfLifeDays,
    });
    await store.replaceUsageStats(opts.regulation, usage);

    // 5. Marca de agua (acotada para no crecer sin límite).
    await store.setState(stateKey, [...processed, ...todo.map((t) => t.slug)].slice(-300));

    return {
      tournamentsProcessed: todo.map((t) => t.slug),
      teams,
      docsUpserted: docs.length,
      docsEmbedded: newDocs.length,
      monsSkipped: [...skipped],
      usageRows: usage.length,
    };
  }

  /**
   * Legalidad para ingesta: la vía normal (Pokédex + allowlist) o, para
   * megas exclusivas de Champions que @pkmn aún no conoce (p. ej.
   * Raichu-Mega-X), la especie base contra la allowlist.
   */
  private isAllowed(pokemon: string, regulation: Regulation): boolean {
    if (this.deps.legality.isLegal(pokemon, regulation)) return true;
    const base = pokemon.replace(/-Mega(-[XY])?$/i, "");
    return this.deps.regulations.allowlist(regulation).has(toID(base));
  }
}

/** Construye el TournamentDoc (incluido el texto que se embebe). */
export function buildDoc(
  tournament: SourceTournament,
  team: SourceTeam,
  pokemon: string,
  set: PokemonSet,
  regulation: Regulation,
): TournamentDoc {
  const teammates = team.sets.map((s) => s.pokemon).filter((name) => name !== pokemon);
  const record = team.wins != null && team.losses != null ? ` (${team.wins}-${team.losses})` : "";
  const text =
    `${pokemon} @ ${set.item || "sin ítem"} — ${set.nature}, habilidad ${set.ability || "desconocida"}, ` +
    `con ${set.moves.join(", ") || "movimientos desconocidos"}; puesto #${team.placement}${record} ` +
    `en ${tournament.name} (${tournament.date}), junto a ${teammates.join(", ")}.`;

  return {
    id: `limitless-${tournament.slug}-p${team.placement}-${toID(team.player)}-${toID(pokemon)}`,
    source: tournament.source,
    tournament: tournament.name,
    date: tournament.date,
    regulation,
    placement: team.placement,
    player: team.player,
    pokemon,
    set,
    teammates,
    wins: team.wins,
    losses: team.losses,
    text,
  };
}

function isoDaysAgo(nowISO: string, days: number): string {
  const ms = Date.parse(nowISO) - days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
