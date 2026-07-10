"use client";

import { useMemo, useRef, useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import { toID } from "@/core/domain/ids";

const MAX_TEAM = 6;

interface Props {
  legalMons: string[];
  team: string[];
  disabled: boolean;
  onAdd(mon: string): void;
  onRemove(mon: string): void;
  onAnalyze(): void;
}

/**
 * Party vertical estilo juego: 6 casillas que se van llenando con el sprite
 * de cada Pokémon, un buscador con sugerencias del roster legal y el botón
 * que manda el análisis al chat. (PLAN.md §7.)
 */
export function PartySidebar({ legalMons, team, disabled, onAdd, onRemove, onAnalyze }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = toID(query);
    if (q === "") return [];
    return legalMons.filter((m) => toID(m).includes(q) && !team.includes(m)).slice(0, 8);
  }, [legalMons, query, team]);

  const full = team.length >= MAX_TEAM;

  function add(mon: string) {
    onAdd(mon);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  // Si la ventana es muy baja, la party scrollea por dentro (nunca la página).
  // El padding derecho/inferior evita que el overflow recorte la sombra dura.
  return (
    <aside className="flex w-full flex-col gap-3 lg:min-h-0 lg:w-[272px] lg:overflow-y-auto lg:pr-1.5 lg:pb-1.5">
      <div className="game-box p-3">
        <h2 className="font-pixel mb-3 text-[10px] tracking-wide uppercase">
          Tu equipo <span className="text-poke-red">{team.length}</span>/{MAX_TEAM}
        </h2>

        {/* Buscador con sugerencias */}
        <div className="relative mb-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            disabled={full}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) add(suggestions[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={full ? "Equipo completo" : "Añadir Pokémon…"}
            className="game-inset w-full px-3 py-2 text-sm outline-none placeholder:text-muted disabled:opacity-50"
          />
          {open && suggestions.length > 0 && (
            <ul className="game-box absolute z-10 mt-1 max-h-72 w-full overflow-y-auto py-1">
              {suggestions.map((mon) => (
                <li key={mon}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(mon)}
                    className="flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-panel-2"
                  >
                    <PixelSprite pokemon={mon} size={32} />
                    {mon}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Las 6 casillas */}
        <ul className="space-y-2">
          {Array.from({ length: MAX_TEAM }, (_, i) => {
            const mon = team[i];
            return (
              <li key={i}>
                {mon ? (
                  <div className="game-inset flex items-center gap-2 bg-panel py-1 pr-2 pl-1">
                    <PixelSprite pokemon={mon} size={44} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{mon}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(mon)}
                      title={`Quitar a ${mon}`}
                      className="font-pixel shrink-0 text-[10px] text-muted hover:text-poke-red"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded border-2 border-dashed border-muted/50 py-1 pr-2 pl-1 text-muted">
                    <svg viewBox="0 0 24 24" width={44} height={44} className="opacity-30">
                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                    </svg>
                    <span className="font-pixel text-[9px] uppercase">Libre</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={team.length === 0 || disabled}
          className="game-btn font-pixel mt-3 w-full bg-poke-red px-3 py-3 text-[10px] text-white uppercase"
        >
          {disabled ? "Calculando…" : "Analizar equipo"}
        </button>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Roster legal de la Reg. M-B ({legalMons.length} especies). Sprites: Pokémon Showdown.
      </p>
    </aside>
  );
}
