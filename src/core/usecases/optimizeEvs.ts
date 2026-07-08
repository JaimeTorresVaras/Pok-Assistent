import { EV_STEP, MAX_EVS_PER_STAT, MAX_EVS_TOTAL } from "@/core/domain/evs";
import type { CalcMon, EVs, IVs, Nature, StatKey } from "@/core/domain/model";
import { statAtLevel50 } from "@/core/domain/stats";
import type { DamageCalcPort } from "@/core/ports/damageCalcPort";
import type { PokedexPort } from "@/core/ports/pokedexPort";

/** El Pokémon que estamos optimizando (identidad + naturaleza/ítem/etc.). */
export interface OptimizerMon {
  pokemon: string;
  nature: Nature;
  ivs?: IVs;
  item?: string;
  ability?: string;
  teraType?: string;
}

/**
 * Objetivos (benchmarks) que el spread intenta cumplir. Cada objetivo invierte
 * en UN stat concreto, lo que hace el reparto de 508 EVs simple y explicable.
 */
export type Objective =
  | { kind: "outspeed"; priority: number; targetSpeed: number; label?: string }
  | {
      kind: "survive";
      priority: number;
      investIn: "hp" | "def" | "spd";
      attacker: CalcMon;
      move: string;
      label?: string;
    }
  | {
      kind: "ohko" | "2hko";
      priority: number;
      investIn: "atk" | "spa";
      defender: CalcMon;
      move: string;
      label?: string;
    };

export interface ObjectiveOutcome {
  objective: Objective;
  met: boolean;
  /** EVs añadidos por este objetivo (0 si ya se cumplía o si no se logró). */
  evsSpent: number;
  detail: string;
}

export interface OptimizeResult {
  evs: EVs;
  totalEvs: number;
  met: ObjectiveOutcome[];
  unmet: ObjectiveOutcome[];
}

type FullEVs = Record<StatKey, number>;

/**
 * Caso de uso: resolver EVs orientado a benchmarks (no fuerza bruta) y
 * repartir 508 EVs por prioridad, verificando cada objetivo sobre el spread
 * real a medida que se construye. (PLAN.md §4, Fase 3.)
 *
 * Solo depende de puertos: PokedexPort (stats base) y DamageCalcPort (daño).
 */
export class EVOptimizer {
  constructor(
    private readonly pokedex: PokedexPort,
    private readonly calc: DamageCalcPort,
  ) {}

  optimize(
    mon: OptimizerMon,
    objectives: Objective[],
    opts: { dumpStat?: StatKey } = {},
  ): OptimizeResult {
    const species = this.pokedex.getSpecies(mon.pokemon);
    if (!species) throw new Error(`EVOptimizer: Pokémon desconocido "${mon.pokemon}"`);
    const base = species.baseStats;
    const evs: FullEVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    const met: ObjectiveOutcome[] = [];
    const unmet: ObjectiveOutcome[] = [];

    // Mayor prioridad primero: se resuelve y "gana" los EVs antes que el resto.
    const ordered = [...objectives].sort((a, b) => b.priority - a.priority);
    for (const objective of ordered) {
      const stat = investStat(objective);
      const before = evs[stat];
      const detail = this.solve(mon, base, evs, objective, stat);
      if (detail === null) {
        unmet.push({
          objective,
          met: false,
          evsSpent: 0,
          detail: "no alcanzable dentro de 252/508",
        });
      } else {
        met.push({ objective, met: true, evsSpent: evs[stat] - before, detail });
      }
    }

    // El sobrante va a un stat útil (por defecto HP).
    const leftover = MAX_EVS_TOTAL - totalEVs(evs);
    if (leftover >= EV_STEP) {
      const dump = opts.dumpStat ?? "hp";
      const add = Math.min(leftover, MAX_EVS_PER_STAT - evs[dump]);
      evs[dump] += add - (add % EV_STEP);
    }

    return { evs: clean(evs), totalEvs: totalEVs(evs), met, unmet };
  }

  /**
   * Sube los EVs de `stat` (paso de 4) hasta cumplir el objetivo, sin pasar de
   * 252 en el stat ni de 508 en total. Devuelve el detalle si se cumple; si no,
   * restaura los EVs previos y devuelve null.
   */
  private solve(
    mon: OptimizerMon,
    base: Record<StatKey, number>,
    evs: FullEVs,
    objective: Objective,
    stat: StatKey,
  ): string | null {
    const start = evs[stat];
    const otherEVs = totalEVs(evs) - start;
    for (let e = start; e <= MAX_EVS_PER_STAT; e += EV_STEP) {
      if (otherEVs + e > MAX_EVS_TOTAL) break; // presupuesto de 508 agotado
      evs[stat] = e;
      const check = this.check(mon, base, evs, objective);
      if (check.ok) return check.detail;
    }
    evs[stat] = start; // rollback: no se logró
    return null;
  }

  private check(
    mon: OptimizerMon,
    base: Record<StatKey, number>,
    evs: FullEVs,
    objective: Objective,
  ): { ok: boolean; detail: string } {
    switch (objective.kind) {
      case "outspeed": {
        const spe = statAtLevel50(base.spe, iv(mon, "spe"), evs.spe, "spe", mon.nature);
        return {
          ok: spe > objective.targetSpeed,
          detail: `Spe ${spe} vs objetivo ${objective.targetSpeed}`,
        };
      }
      case "survive": {
        const res = this.calc.calcDamage(
          objective.attacker,
          this.toCalcMon(mon, evs),
          objective.move,
        );
        return { ok: res.maxPct < 100, detail: `recibe máx ${res.maxPct}%` };
      }
      case "ohko":
      case "2hko": {
        const res = this.calc.calcDamage(
          this.toCalcMon(mon, evs),
          objective.defender,
          objective.move,
        );
        const threshold = objective.kind === "ohko" ? 100 : 50;
        return { ok: res.minPct >= threshold, detail: `hace mín ${res.minPct}% (>= ${threshold})` };
      }
    }
  }

  private toCalcMon(mon: OptimizerMon, evs: FullEVs): CalcMon {
    return {
      pokemon: mon.pokemon,
      level: 50,
      nature: mon.nature,
      evs: clean(evs),
      ivs: mon.ivs,
      item: mon.item,
      ability: mon.ability,
      teraType: mon.teraType,
    };
  }
}

function investStat(objective: Objective): StatKey {
  switch (objective.kind) {
    case "outspeed":
      return "spe";
    case "survive":
      return objective.investIn;
    case "ohko":
    case "2hko":
      return objective.investIn;
  }
}

function iv(mon: OptimizerMon, stat: StatKey): number {
  return mon.ivs?.[stat] ?? 31;
}

function totalEVs(evs: FullEVs): number {
  return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
}

/** Convierte el registro completo a EVs omitiendo los ceros. */
function clean(evs: FullEVs): EVs {
  const out: EVs = {};
  for (const key of Object.keys(evs) as StatKey[]) {
    if (evs[key] > 0) out[key] = evs[key];
  }
  return out;
}
