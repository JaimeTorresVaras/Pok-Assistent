import { calculate, Field, Generations, Move, Pokemon } from "@smogon/calc";

import type { EVs, IVs, Nature, StatKey } from "@/types/domain";

/** Un lado del cálculo de daño (atacante o defensor). */
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
  /** Descripción de KO, p. ej. "99.6% chance to 2HKO" (extraída de la desc). */
  koChance: string;
  /** Descripción completa del cálculo (formato @smogon/calc). */
  desc: string;
}

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

function natureMultiplier(nature: Nature, stat: StatKey): number {
  if (stat === "hp") return 1;
  const effect = NATURES[nature];
  if (effect.plus === stat) return 1.1;
  if (effect.minus === stat) return 0.9;
  return 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * CalcEngine — envuelve `@smogon/calc` para dobles VGC (nivel 50, spread
 * damage automático) y expone la fórmula de stats a nivel 50. (PLAN.md §4,
 * Fase 2.) Regla de oro: cualquier número de daño/stats pasa siempre por acá,
 * nunca lo inventa la IA.
 */
export class CalcEngine {
  private readonly gen: ReturnType<typeof Generations.get>;

  constructor(genNum = 9) {
    // Generations.get espera un GenerationNum (1..9), no un number cualquiera.
    this.gen = Generations.get(genNum as Parameters<typeof Generations.get>[0]);
  }

  /** Daño de `attacker` usando `move` contra `defender`, en formato dobles. */
  calcDamage(attacker: CalcMon, defender: CalcMon, move: string): DamageResult {
    const atk = this.toPokemon(attacker);
    const def = this.toPokemon(defender);
    const result = calculate(
      this.gen,
      atk,
      def,
      new Move(this.gen, move),
      new Field({ gameType: "Doubles" }),
    );

    const [minDamage, maxDamage] = result.range();
    const maxHP = def.maxHP();
    const desc = result.desc();

    return {
      minDamage,
      maxDamage,
      minPct: round1((minDamage / maxHP) * 100),
      maxPct: round1((maxDamage / maxHP) * 100),
      koChance: koTextFrom(desc),
      desc,
    };
  }

  /**
   * Valor final de un stat a nivel 50, con la fórmula oficial:
   *   base * 2 + IV + floor(EV/4) → escalar por nivel → +nivel+10 (HP) o
   *   (+5) * multiplicador de naturaleza (resto).
   */
  statAtLevel50(base: number, iv: number, ev: number, stat: StatKey, nature: Nature): number {
    const level = 50;
    const point = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
    if (stat === "hp") return point + level + 10;
    return Math.floor((point + 5) * natureMultiplier(nature, stat));
  }

  private toPokemon(mon: CalcMon): Pokemon {
    const options = {
      level: mon.level,
      nature: mon.nature,
      evs: mon.evs,
      ivs: mon.ivs,
      item: mon.item,
      ability: mon.ability,
      teraType: mon.teraType,
    };
    // El tipo de `teraType` en @smogon/calc es TypeName (no string); casteamos
    // el objeto de opciones al tipo del constructor para el wrapper.
    return new Pokemon(this.gen, mon.pokemon, options as ConstructorParameters<typeof Pokemon>[2]);
  }
}

/** Extrae el texto de KO de la descripción de @smogon/calc (tras " -- "). */
function koTextFrom(desc: string): string {
  const idx = desc.indexOf(" -- ");
  return idx >= 0 ? desc.slice(idx + 4) : "";
}
