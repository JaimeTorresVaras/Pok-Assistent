/**
 * Tipos de dominio del sistema (ver PLAN.md §3 "Modelo de datos").
 *
 * Todo está parametrizado por `Regulation`: el formato de Pokémon Champions
 * cambia cada pocos meses, así que el sistema debe poder cambiar de regulación
 * sin tocar la lógica.
 */

/** Identificador de la regulación activa, p. ej. "M-B". */
export type Regulation = string;

/** Las seis estadísticas de un Pokémon. */
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

/** Las 25 naturalezas del juego. */
export type Nature =
  | "Adamant"
  | "Bashful"
  | "Bold"
  | "Brave"
  | "Calm"
  | "Careful"
  | "Docile"
  | "Gentle"
  | "Hardy"
  | "Hasty"
  | "Impish"
  | "Jolly"
  | "Lax"
  | "Lonely"
  | "Mild"
  | "Modest"
  | "Naive"
  | "Naughty"
  | "Quiet"
  | "Quirky"
  | "Rash"
  | "Relaxed"
  | "Sassy"
  | "Serious"
  | "Timid";

/** Reparto de EVs (0–252 por stat, suma ≤ 508). Los stats omitidos valen 0. */
export type EVs = Partial<Record<StatKey, number>>;

/** Reparto de IVs (0–31 por stat). Los stats omitidos se asumen 31. */
export type IVs = Partial<Record<StatKey, number>>;

/** Una entrada de uso: un nombre + su porcentaje de uso en el meta. */
export interface UsageEntry {
  name: string;
  pct: number;
}

/** Un spread de EVs observado en el meta, con su % de uso. */
export interface UsageSpread {
  nature: Nature;
  /** Formato Showdown, p. ej. "252 Atk / 4 Def / 252 Spe". */
  evs: string;
  pct: number;
}

/**
 * Amenaza del meta: lo que scrapeamos/mantenemos por cada Pokémon top.
 * (PLAN.md §3 "Amenaza del meta".)
 */
export interface ThreatMon {
  regulation: Regulation;
  pokemon: string;
  usagePct: number;
  moves: UsageEntry[];
  items: UsageEntry[];
  abilities: UsageEntry[];
  spreads: UsageSpread[];
  teraTypes: UsageEntry[];
}

/**
 * Un set concreto de un Pokémon: parseado desde un paste de torneo con
 * `@pkmn/sets`, o propuesto por el sistema.
 */
export interface PokemonSet {
  nature: Nature;
  item: string;
  ability: string;
  teraType: string;
  evs: EVs;
  moves: string[];
}

/**
 * Documento de torneo: unidad de ingesta del RAG (un registro por
 * Pokémon-en-equipo). (PLAN.md §3 "Documento de torneo".)
 */
export interface TournamentDoc {
  id: string;
  source: string;
  tournament: string;
  /** Fecha ISO, p. ej. "2026-07-05". */
  date: string;
  regulation: Regulation;
  placement: number;
  player: string;
  pokemon: string;
  set: PokemonSet;
  teammates: string[];
  /** Texto que se convierte en vector (embedding). */
  text: string;
  /** Vector del embedding (se rellena en la ingesta). */
  embedding?: number[];
}

/** Un objetivo (benchmark), marcado como verificado o no. */
export interface Benchmark {
  goal: string;
  target?: string;
  verified: boolean;
}

/** Recomendación de salida para un Pokémon del usuario. (PLAN.md §3.) */
export interface Recommendation {
  pokemon: string;
  recommended: {
    nature: Nature;
    item: string;
    evs: EVs;
    moves: string[];
  };
  reasoning: string;
  benchmarks: Benchmark[];
  /** Movimientos más usados del dataset, con su %, p. ej. "Spore 91%". */
  metaMoves: string[];
}
