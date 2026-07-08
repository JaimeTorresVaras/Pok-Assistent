import { calculate, Field, Generations, Move, Pokemon } from "@smogon/calc";

import type { CalcMon, DamageResult } from "@/core/domain/model";
import type { DamageCalcPort } from "@/core/ports/damageCalcPort";

/**
 * Adaptador de DamageCalcPort sobre @smogon/calc, en formato dobles VGC
 * (nivel 50, spread damage automático).
 */
export class SmogonDamageCalcAdapter implements DamageCalcPort {
  private readonly gen: ReturnType<typeof Generations.get>;

  constructor(genNum = 9) {
    // Generations.get espera un GenerationNum (1..9), no un number cualquiera.
    this.gen = Generations.get(genNum as Parameters<typeof Generations.get>[0]);
  }

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

    // Los movimientos de estado (daño 0) pueden no tener descripción de KO.
    let desc = "";
    try {
      desc = result.desc();
    } catch {
      desc = "";
    }

    return {
      minDamage,
      maxDamage,
      minPct: round1((minDamage / maxHP) * 100),
      maxPct: round1((maxDamage / maxHP) * 100),
      koChance: koTextFrom(desc),
      desc,
    };
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Extrae el texto de KO de la descripción de @smogon/calc (tras " -- "). */
function koTextFrom(desc: string): string {
  const idx = desc.indexOf(" -- ");
  return idx >= 0 ? desc.slice(idx + 4) : "";
}
