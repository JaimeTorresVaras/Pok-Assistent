/**
 * Normaliza un nombre al "id" estándar del ecosistema Showdown/@pkmn
 * (minúsculas, solo alfanumérico): "Landorus-Therian" -> "landorustherian".
 * Es la clave con la que se comparan allowlists y especies.
 */
export function toID(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
