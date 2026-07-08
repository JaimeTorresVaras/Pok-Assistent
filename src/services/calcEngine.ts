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
  /** Descripción de KO, p. ej. "guaranteed 2HKO". */
  koChance: string;
}

/**
 * CalcEngine — envuelve `@smogon/calc` para dobles VGC (nivel 50, spread
 * damage x0.75). (PLAN.md Fase 2.) Regla de oro: la IA nunca calcula daño;
 * cualquier número pasa siempre por acá.
 */
export class CalcEngine {
  /** Daño de `attacker` usando `move` contra `defender`. */
  calcDamage(attacker: CalcMon, defender: CalcMon, move: string): DamageResult {
    throw new Error(
      `CalcEngine.calcDamage: pendiente (Fase 2) — ${attacker.pokemon} usa ${move} vs ${defender.pokemon}`,
    );
  }

  /** Valor final de un stat a nivel 50 (fórmula oficial de stats). */
  statAtLevel50(base: number, iv: number, ev: number, stat: StatKey, nature: Nature): number {
    throw new Error(
      `CalcEngine.statAtLevel50: pendiente (Fase 2) — ${stat} (base ${base}, iv ${iv}, ev ${ev}, ${nature})`,
    );
  }
}
