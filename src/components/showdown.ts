import { toShowdownSet } from "@/core/domain/evs";
import type { Recommendation } from "@/core/domain/model";

/** Export Showdown de una recomendación (util compartido por la UI). */
export function recommendationToShowdown(rec: Recommendation): string {
  return toShowdownSet({
    pokemon: rec.pokemon,
    item: rec.recommended.item || undefined,
    ability: rec.recommended.ability,
    teraType: rec.recommended.teraType,
    nature: rec.recommended.nature,
    evs: rec.recommended.evs,
    moves: rec.recommended.moves,
  });
}
