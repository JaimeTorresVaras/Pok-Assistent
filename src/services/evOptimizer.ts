import type { EVs } from "@/types/domain";

/** Tipo de objetivo para el optimizador de EVs. (PLAN.md §4.) */
export type ObjectiveKind = "ohko" | "2hko" | "survive" | "outspeed";

export interface EVObjective {
  kind: ObjectiveKind;
  /** Amenaza/blanco al que apunta el objetivo. */
  target: string;
  /** Movimiento involucrado (para objetivos ofensivos/defensivos). */
  move?: string;
  /** Prioridad relativa: mayor = más importante al repartir 508 EVs. */
  priority: number;
}

export interface OptimizedSpread {
  evs: EVs;
  /** Objetivos que se lograron cumplir dentro de 508 EVs. */
  met: EVObjective[];
  /** Objetivos que hubo que sacrificar por falta de EVs. */
  unmet: EVObjective[];
}

/**
 * EVOptimizer — resuelve EVs orientado a benchmarks (no fuerza bruta):
 * calcula los EVs mínimos por objetivo y reparte 508 según prioridad.
 * (PLAN.md §4, Fase 3.)
 */
export class EVOptimizer {
  optimize(pokemon: string, objectives: EVObjective[]): OptimizedSpread {
    throw new Error(
      `EVOptimizer.optimize: pendiente (Fase 3) — ${pokemon} (${objectives.length} objetivos)`,
    );
  }
}
