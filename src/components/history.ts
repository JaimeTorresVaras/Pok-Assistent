import type { Recommendation } from "@/core/domain/model";

/** Un análisis de equipo guardado en el historial local del navegador. */
export interface TeamAnalysis {
  id: string;
  /** Fecha ISO del análisis. */
  at: string;
  team: string[];
  recommendations: Recommendation[];
}

const KEY = "champions-ev-ai.history.v1";
const MAX_ENTRIES = 12;

/**
 * Store externo mínimo sobre localStorage, para consumir con
 * useSyncExternalStore (así el SSR rinde vacío y el cliente hidrata sin
 * setState-en-effect).
 */
const EMPTY: TeamAnalysis[] = [];
let cache: TeamAnalysis[] | null = null;
const listeners = new Set<() => void>();

function read(): TeamAnalysis[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TeamAnalysis[]) : [];
  } catch {
    return [];
  }
}

export function subscribeHistory(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getHistorySnapshot(): TeamAnalysis[] {
  if (cache === null) cache = read();
  return cache;
}

/** En el servidor no hay localStorage: historial vacío (referencia estable). */
export function getServerHistorySnapshot(): TeamAnalysis[] {
  return EMPTY;
}

export function setHistoryEntries(entries: TeamAnalysis[]): void {
  cache = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // localStorage lleno o bloqueado: el historial simplemente no persiste.
  }
  listeners.forEach((listener) => listener());
}

export function addHistoryEntry(entry: TeamAnalysis): void {
  setHistoryEntries([entry, ...getHistorySnapshot()]);
}

export function clearHistoryEntries(): void {
  setHistoryEntries([]);
}

export function newEntry(team: string[], recommendations: Recommendation[]): TeamAnalysis {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
    at: new Date().toISOString(),
    team: [...team],
    recommendations,
  };
}

/** "10/07 18:32" — compacto para la lista del historial. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}
