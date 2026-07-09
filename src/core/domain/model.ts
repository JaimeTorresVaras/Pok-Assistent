/**
 * Modelo de dominio (núcleo de la arquitectura hexagonal). Este archivo no
 * depende de ningún framework ni librería: solo describe el problema.
 * (PLAN.md §3 "Modelo de datos".)
 *
 * Todo está parametrizado por `Regulation`: el formato de Pokémon Champions
 * cambia cada pocos meses, así que el sistema debe poder cambiar de regulación
 * sin tocar la lógica.
 */

/** Identificador de la regulación activa, p. ej. "M-B". */
export type Regulation = string;

/** Las seis estadísticas de un Pokémon. */
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

/** Orden canónico de las stats (el que usa el formato Showdown). */
export const STAT_KEYS: readonly StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

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

/** Datos de una especie tal como los entrega la Pokédex. */
export interface SpeciesInfo {
  /** Identificador normalizado, p. ej. "landorustherian". */
  id: string;
  /** Nombre canónico, p. ej. "Landorus-Therian". */
  name: string;
  /**
   * Id de la especie base para formas/megas (p. ej. "charizard" para
   * Charizard-Mega-Y). Igual a `id` si no es una forma.
   */
  baseSpeciesId: string;
  baseStats: Record<StatKey, number>;
  types: string[];
  abilities: string[];
}

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

/** Amenaza del meta: datos de uso de un Pokémon top. (PLAN.md §3.) */
export interface ThreatMon {
  regulation: Regulation;
  pokemon: string;
  usagePct: number;
  /** % de victorias de los equipos que lo llevan (si la fuente lo da). */
  winratePct?: number;
  moves: UsageEntry[];
  items: UsageEntry[];
  abilities: UsageEntry[];
  spreads: UsageSpread[];
  teraTypes: UsageEntry[];
}

/** Un set concreto de un Pokémon (parseado de un paste o propuesto). */
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
 * Pokémon-en-equipo). (PLAN.md §3.)
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
  /** Récord del equipo en el torneo (para winrate), si la fuente lo da. */
  wins?: number;
  losses?: number;
  /** Texto que se convierte en vector (embedding). */
  text: string;
  /** Vector del embedding (se rellena en la ingesta). */
  embedding?: number[];
}

/** Fila de usage agregado que produce la ingesta (ThreatMon + tamaño de muestra). */
export type UsageStats = ThreatMon & { sampleSize: number };

/** Un participante de un cálculo de daño (atacante o defensor). */
export interface CalcMon {
  pokemon: string;
  level: number;
  nature: Nature;
  evs: EVs;
  ivs?: IVs;
  item?: string;
  ability?: string;
  teraType?: string;
}

/** Resultado de un cálculo de daño. */
export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPct: number;
  maxPct: number;
  /** Texto de KO, p. ej. "99.6% chance to 2HKO" ("" si no aplica). */
  koChance: string;
  /** Descripción completa del cálculo ("" si no aplica). */
  desc: string;
}

/** Un objetivo (benchmark), marcado como verificado o no por el motor. */
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
    ability?: string;
    teraType?: string;
    evs: EVs;
    moves: string[];
  };
  reasoning: string;
  benchmarks: Benchmark[];
  /** Movimientos más usados del dataset, con su %, p. ej. "Spore 91%". */
  metaMoves: string[];
}
