import type { PokemonSet } from "@/core/domain/model";

/** Un torneo publicado por la fuente (solo terminados, no en vivo). */
export interface SourceTournament {
  /** Identificador estable en la fuente (slug). */
  slug: string;
  name: string;
  /** Fecha ISO (YYYY-MM-DD). */
  date: string;
  source: string;
  players?: number;
}

/** Un equipo de un torneo, ya parseado a sets del dominio. */
export interface SourceTeam {
  player: string;
  placement: number;
  wins?: number;
  losses?: number;
  /** Sets del equipo. En Champions: naturaleza/ítem/habilidad/moves reales; EVs no públicos. */
  sets: { pokemon: string; set: PokemonSet }[];
}

/**
 * Puerto de fuente de torneos (PLAN.md §6, paso "Fetch").
 * Adaptador actual: Pikalytics (índice + páginas de torneo) + Limitless
 * (teamlists). Otras fuentes (Victory Road, RK9) entrarían como adaptadores
 * nuevos de este mismo puerto.
 */
export interface TournamentSourcePort {
  /** Torneos terminados, del más reciente al más antiguo. */
  listRecent(): Promise<SourceTournament[]>;

  /** Equipos de un torneo (hasta `maxPlacement`), con sus sets parseados. */
  fetchTeams(tournament: SourceTournament, opts?: { maxPlacement?: number }): Promise<SourceTeam[]>;
}
