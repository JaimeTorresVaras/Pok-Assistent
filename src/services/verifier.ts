import type { Recommendation } from "@/types/domain";

/**
 * Verifier — revalida en código TODO lo que propone la IA: recalcula cada
 * benchmark con el CalcEngine y con la fórmula de stats, y corrige o descarta
 * lo que no cuadre antes de mostrarlo.
 *
 * Regla de oro (PLAN.md §1): la IA nunca es la fuente de verdad de un número.
 */
export class Verifier {
  verify(recommendation: Recommendation): Recommendation {
    throw new Error(`Verifier.verify: pendiente (Fase 6) — ${recommendation.pokemon}`);
  }
}
