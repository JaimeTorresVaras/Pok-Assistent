import type { CalcMon, DamageResult } from "@/core/domain/model";

/**
 * Puerto de cálculo de daño (dobles VGC, nivel 50, spread damage).
 * Adaptador actual: @smogon/calc (src/adapters/smogon).
 *
 * Regla de oro (PLAN.md §1): cualquier número de daño pasa siempre por este
 * puerto; la IA nunca es la fuente de verdad de un número.
 */
export interface DamageCalcPort {
  calcDamage(attacker: CalcMon, defender: CalcMon, move: string): DamageResult;
}
