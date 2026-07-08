import type { Nature, StatKey } from "./model";

/**
 * Fórmula de stats del juego (dominio puro, sin dependencias). La usa el
 * optimizador de EVs para objetivos de velocidad y el Verifier para
 * comprobar los números que proponga la IA. (PLAN.md §4.)
 */

/**
 * Efecto de cada naturaleza: `plus` sube ese stat un 10 %, `minus` lo baja un
 * 10 %. Las naturalezas neutras no tienen ni `plus` ni `minus`. (La HP nunca
 * se ve afectada por la naturaleza.)
 */
const NATURES: Record<Nature, { plus?: StatKey; minus?: StatKey }> = {
  Adamant: { plus: "atk", minus: "spa" },
  Bashful: {},
  Bold: { plus: "def", minus: "atk" },
  Brave: { plus: "atk", minus: "spe" },
  Calm: { plus: "spd", minus: "atk" },
  Careful: { plus: "spd", minus: "spa" },
  Docile: {},
  Gentle: { plus: "spd", minus: "def" },
  Hardy: {},
  Hasty: { plus: "spe", minus: "def" },
  Impish: { plus: "def", minus: "spa" },
  Jolly: { plus: "spe", minus: "spa" },
  Lax: { plus: "def", minus: "spd" },
  Lonely: { plus: "atk", minus: "def" },
  Mild: { plus: "spa", minus: "def" },
  Modest: { plus: "spa", minus: "atk" },
  Naive: { plus: "spe", minus: "spd" },
  Naughty: { plus: "atk", minus: "spd" },
  Quiet: { plus: "spa", minus: "spe" },
  Quirky: {},
  Rash: { plus: "spa", minus: "spd" },
  Relaxed: { plus: "def", minus: "spe" },
  Sassy: { plus: "spd", minus: "spe" },
  Serious: {},
  Timid: { plus: "spe", minus: "atk" },
};

export function natureMultiplier(nature: Nature, stat: StatKey): number {
  if (stat === "hp") return 1;
  const effect = NATURES[nature];
  if (effect.plus === stat) return 1.1;
  if (effect.minus === stat) return 0.9;
  return 1;
}

/**
 * Valor final de un stat a nivel 50, con la fórmula oficial:
 *   base * 2 + IV + floor(EV/4) → escalar por nivel → +nivel+10 (HP) o
 *   (+5) * multiplicador de naturaleza (resto).
 */
export function statAtLevel50(
  base: number,
  iv: number,
  ev: number,
  stat: StatKey,
  nature: Nature,
): number {
  const level = 50;
  const point = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (stat === "hp") return point + level + 10;
  return Math.floor((point + 5) * natureMultiplier(nature, stat));
}
