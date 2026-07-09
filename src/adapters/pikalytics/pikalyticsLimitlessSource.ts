import { toID } from "@/core/domain/ids";
import type { Nature, PokemonSet } from "@/core/domain/model";
import type {
  SourceTeam,
  SourceTournament,
  TournamentSourcePort,
} from "@/core/ports/tournamentSourcePort";

/**
 * Adaptador de TournamentSourcePort sobre Pikalytics + Limitless:
 *
 *   1. Índice de torneos de Champions: pikalytics.com/tournaments (SSR)
 *   2. Página del torneo (SSR): rank, jugador, récord W-L, especies canónicas
 *      (data-pokemon, con "-Mega") y link a la teamlist de Limitless
 *   3. Teamlist de Limitless (SSR): set real por Pokémon — ítem, habilidad,
 *      NATURALEZA y movimientos. (Champions no publica EVs ni Tera.)
 *
 * Los parsers son funciones puras (HTML → datos) testeadas con fixtures
 * reales; la clase solo orquesta los fetch.
 */

const PIKA_BASE = "https://www.pikalytics.com";
const USER_AGENT = "champions-ev-ai/0.1 (proyecto personal de aprendizaje)";
const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

const NATURES = new Set([
  "Adamant",
  "Bashful",
  "Bold",
  "Brave",
  "Calm",
  "Careful",
  "Docile",
  "Gentle",
  "Hardy",
  "Hasty",
  "Impish",
  "Jolly",
  "Lax",
  "Lonely",
  "Mild",
  "Modest",
  "Naive",
  "Naughty",
  "Quiet",
  "Quirky",
  "Rash",
  "Relaxed",
  "Sassy",
  "Serious",
  "Timid",
]);

/** Decodifica las entidades HTML que aparecen en estos documentos. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** "Jul 6, 2026" -> "2026-07-06" (null si no hay fecha en el texto). */
export function toISODate(text: string): string | null {
  const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}`;
}

/** Parsea el índice de torneos. Solo devuelve torneos TERMINADOS (no live). */
export function parseTournamentListing(html: string): SourceTournament[] {
  const out: SourceTournament[] = [];
  const anchorRe =
    /<a class="tournament-index-row ([^"]*)" href="\/tournaments\/limitless\/[^"]+" data-source="([^"]+)" data-slug="([^"]+)">/g;

  const matches = [...html.matchAll(anchorRe)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const chunk = html.slice(m.index!, matches[i + 1]?.index ?? html.length);
    const classes = m[1];
    if (classes.includes("tournament-index-row-live")) continue; // aún en juego

    const name = chunk.match(/tournament-index-title">([^<]+)</)?.[1];
    const date = toISODate(chunk);
    if (!name || !date) continue; // sin fecha => no terminó o fila rara

    const players = chunk.match(/<b>(\d+)<\/b>\s*players/)?.[1];
    out.push({
      slug: m[3],
      name: decodeEntities(name.trim()),
      date,
      source: m[2],
      players: players ? Number(players) : undefined,
    });
  }
  return out;
}

/** Un equipo tal como aparece en la página del torneo de Pikalytics. */
export interface ParsedTeamEntry {
  placement: number;
  player: string;
  playerSlug: string;
  limitlessId: string;
  wins?: number;
  losses?: number;
  /** Especies canónicas de Pikalytics (incluyen "-Mega"), en orden de equipo. */
  pokemonNames: string[];
}

export function parseTournamentPage(html: string): {
  date: string | null;
  teams: ParsedTeamEntry[];
} {
  const date = toISODate(html);
  const teams: ParsedTeamEntry[] = [];

  const entryRe = /tournament-team-entry" data-index="\d+"/g;
  const matches = [...html.matchAll(entryRe)];
  for (let i = 0; i < matches.length; i++) {
    const chunk = html.slice(matches[i].index!, matches[i + 1]?.index ?? html.length);

    const rank = chunk.match(/tournament-team-rank">#?(\d+)</)?.[1];
    const player = chunk.match(/tournament-team-author">([^<]+)</)?.[1];
    const record = chunk.match(/tournament-team-record">(\d+)-(\d+)(?:-\d+)?</);
    const link = chunk.match(
      /play\.limitlesstcg\.com\/tournament\/([a-z0-9]+)\/player\/([^/"]+)\/teamlist/,
    );
    const pokemonNames = [
      ...new Set([...chunk.matchAll(/data-pokemon="([^"]+)"/g)].map((p) => decodeEntities(p[1]))),
    ];

    if (!rank || !player || !link) continue;
    teams.push({
      placement: Number(rank),
      player: decodeEntities(player.trim()),
      playerSlug: link[2],
      limitlessId: link[1],
      wins: record ? Number(record[1]) : undefined,
      losses: record ? Number(record[2]) : undefined,
      pokemonNames,
    });
  }
  return { date, teams };
}

/** Parsea una teamlist de Limitless a sets del dominio (EVs no públicos => {}). */
export function parseLimitlessTeamlist(html: string): { pokemon: string; set: PokemonSet }[] {
  const out: { pokemon: string; set: PokemonSet }[] = [];
  const blocks = html.split('<div class="pkmn">').slice(1);

  for (const block of blocks) {
    const name = block.match(/class="name">[\s\S]{0,300}?<span>([^<]+)<\/span>/)?.[1];
    if (!name) continue;

    const item = block.match(/class="item">([^<]*)</)?.[1] ?? "";
    const ability = block.match(/class="ability">Ability:\s*([^<]+)</)?.[1] ?? "";
    const natureRaw = block.match(/class="nature">([A-Za-z]+)\s+Nature</)?.[1];
    const attacksChunk = block.match(/<ul class="attacks">([\s\S]*?)<\/ul>/)?.[1] ?? "";
    const moves = [...attacksChunk.matchAll(/<li>([^<]+)<\/li>/g)].map((m) =>
      decodeEntities(m[1].trim()),
    );

    out.push({
      pokemon: decodeEntities(name.trim()),
      set: {
        nature: (natureRaw && NATURES.has(natureRaw) ? natureRaw : "Serious") as Nature,
        item: decodeEntities(item.trim()),
        ability: decodeEntities(ability.trim()),
        teraType: "", // Champions no expone Tera en teamsheets
        evs: {}, // EVs no públicos en Champions (se derivan aguas abajo)
        moves,
      },
    });
  }
  return out;
}

/** Prefijos de forma de Limitless ("Alolan Ninetales") → sufijo estándar. */
const FORM_PREFIXES: Record<string, string> = {
  Alolan: "Alola",
  Galarian: "Galar",
  Hisuian: "Hisui",
  Paldean: "Paldea",
  "Eternal Flower": "Eternal",
  Bloodmoon: "Bloodmoon",
  // Formas de Rotom ("Wash Rotom" -> "Rotom-Wash")
  Wash: "Wash",
  Heat: "Heat",
  Mow: "Mow",
  Fan: "Fan",
  Frost: "Frost",
};

/**
 * Normaliza el estilo de Limitless "<Forma> <Especie>" al estándar
 * "<Especie>-<Forma>": "Eternal Flower Floette" -> "Floette-Eternal".
 */
export function normalizeLimitlessName(name: string): string {
  for (const [prefix, suffix] of Object.entries(FORM_PREFIXES)) {
    if (name.startsWith(`${prefix} `)) {
      return `${name.slice(prefix.length + 1)}-${suffix}`;
    }
  }
  return name;
}

/**
 * Canonicaliza el nombre del set de la teamlist ("Dragonite") con el nombre
 * de Pikalytics ("Dragonite-Mega") cuando corresponden al mismo mon.
 */
export function canonicalName(teamlistName: string, pikaNames: string[]): string {
  const normalized = normalizeLimitlessName(teamlistName);
  const base = toID(normalized);
  return pikaNames.find((p) => toID(p) === base || toID(p).startsWith(base)) ?? normalized;
}

export class PikalyticsLimitlessSource implements TournamentSourcePort {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly delayMs: number;

  constructor(opts: { fetchFn?: typeof fetch; baseUrl?: string; delayMs?: number } = {}) {
    this.fetchFn = opts.fetchFn ?? fetch;
    this.baseUrl = opts.baseUrl ?? PIKA_BASE;
    this.delayMs = opts.delayMs ?? 600; // rate limit amable con las fuentes
  }

  async listRecent(): Promise<SourceTournament[]> {
    const html = await this.get(`${this.baseUrl}/tournaments`);
    return parseTournamentListing(html);
  }

  async fetchTeams(
    tournament: SourceTournament,
    opts: { maxPlacement?: number } = {},
  ): Promise<SourceTeam[]> {
    const maxPlacement = opts.maxPlacement ?? 16;
    const html = await this.get(`${this.baseUrl}/tournaments/limitless/${tournament.slug}`);
    const page = parseTournamentPage(html);

    const out: SourceTeam[] = [];
    for (const entry of page.teams.filter((t) => t.placement <= maxPlacement)) {
      await this.sleep();
      const teamlistUrl = `https://play.limitlesstcg.com/tournament/${entry.limitlessId}/player/${entry.playerSlug}/teamlist`;
      let sets: { pokemon: string; set: PokemonSet }[];
      try {
        sets = parseLimitlessTeamlist(await this.get(teamlistUrl));
      } catch {
        continue; // teamlist privada o caída: saltamos el equipo, no la ingesta
      }
      if (sets.length === 0) continue;

      out.push({
        player: entry.player,
        placement: entry.placement,
        wins: entry.wins,
        losses: entry.losses,
        sets: sets.map(({ pokemon, set }) => ({
          pokemon: canonicalName(pokemon, entry.pokemonNames),
          set,
        })),
      });
    }
    return out;
  }

  private async get(url: string): Promise<string> {
    const res = await this.fetchFn(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`Fuente de torneos ${res.status}: ${url}`);
    return res.text();
  }

  private sleep(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }
}
