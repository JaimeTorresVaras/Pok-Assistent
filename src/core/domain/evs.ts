import type { EVs, Nature, StatKey } from "./model";
import { STAT_KEYS } from "./model";

/** Reglas de presupuesto de EVs del juego. */
export const MAX_EVS_PER_STAT = 252;
export const MAX_EVS_TOTAL = 508;
export const EV_STEP = 4;

/** Etiquetas Showdown de cada stat. */
const LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

/** Alias aceptados al parsear ("SpA", "Sp. Atk", "Speed", ...). */
const ALIASES: Record<string, StatKey> = {
  hp: "hp",
  atk: "atk",
  attack: "atk",
  def: "def",
  defense: "def",
  spa: "spa",
  spatk: "spa",
  spd: "spd",
  spdef: "spd",
  spe: "spe",
  speed: "spe",
};

/** Suma total de un reparto de EVs. */
export function totalEvs(evs: EVs): number {
  return STAT_KEYS.reduce((sum, s) => sum + (evs[s] ?? 0), 0);
}

/** Parsea un spread Showdown: "252 Atk / 4 Def / 252 Spe" -> {atk:252,...}. */
export function parseShowdownEvs(spread: string): EVs {
  const out: EVs = {};
  for (const part of spread.split("/")) {
    const match = part.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const stat = ALIASES[match[2].toLowerCase().replace(/[^a-z]/g, "")];
    if (stat) out[stat] = Number(match[1]);
  }
  return out;
}

/** Formatea EVs al estilo Showdown en orden canónico (HP/Atk/.../Spe). */
export function formatShowdownEvs(evs: EVs): string {
  return STAT_KEYS.filter((s) => (evs[s] ?? 0) > 0)
    .map((s) => `${evs[s]} ${LABELS[s]}`)
    .join(" / ");
}

/** Datos necesarios para exportar un set en formato Showdown. */
export interface ShowdownSetInput {
  pokemon: string;
  item?: string;
  ability?: string;
  level?: number;
  teraType?: string;
  nature: Nature;
  evs: EVs;
  moves: string[];
}

/** Exporta un set al formato de texto de Showdown (para copiar/pegar). */
export function toShowdownSet(set: ShowdownSetInput): string {
  const lines: string[] = [];
  lines.push(set.item ? `${set.pokemon} @ ${set.item}` : set.pokemon);
  if (set.ability) lines.push(`Ability: ${set.ability}`);
  lines.push(`Level: ${set.level ?? 50}`);
  if (set.teraType) lines.push(`Tera Type: ${set.teraType}`);
  const evText = formatShowdownEvs(set.evs);
  if (evText) lines.push(`EVs: ${evText}`);
  lines.push(`${set.nature} Nature`);
  for (const move of set.moves) lines.push(`- ${move}`);
  return lines.join("\n");
}
