"use client";

import { PixelSprite } from "@/components/PixelSprite";
import { formatWhen, type TeamAnalysis } from "@/components/history";

interface Props {
  open: boolean;
  history: TeamAnalysis[];
  disabled: boolean;
  canAnalyze: boolean;
  onToggle(): void;
  onSelectEntry(entry: TeamAnalysis): void;
  onClearHistory(): void;
  onAnalyze(): void;
  onMeta(): void;
}

/** Funciones que llegarán en próximas fases (se muestran bloqueadas). */
const UPCOMING = [
  { label: "Chat IA (Claude)", hint: "Fase 6" },
  { label: "Calculadora de EVs", hint: "pronto" },
  { label: "Novedades del meta", hint: "pronto" },
];

/**
 * Izquierda: un riel fino SIEMPRE visible (colapsar/expandir + mini
 * accesos) y, cuando está abierto, el panel con historial de análisis
 * (persistido en el navegador) y el selector de funciones.
 */
export function SideNav({
  open,
  history,
  disabled,
  canAnalyze,
  onToggle,
  onSelectEntry,
  onClearHistory,
  onAnalyze,
  onMeta,
}: Props) {
  return (
    <div className="order-3 flex flex-col gap-3 lg:order-none lg:h-full lg:min-h-0 lg:flex-row">
      {/* Riel: nunca se esconde */}
      <div className="game-box flex flex-row items-center gap-2 self-start p-1.5 lg:h-full lg:w-11 lg:flex-col lg:self-auto">
        <button
          type="button"
          onClick={onToggle}
          title={open ? "Ocultar historial y funciones" : "Mostrar historial y funciones"}
          className="game-btn font-pixel bg-panel-2 px-2 py-1.5 text-[9px]"
        >
          {open ? "◀" : "▶"}
        </button>
        <div className="h-6 w-0.5 bg-ink/20 lg:h-0.5 lg:w-6" aria-hidden />
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled || !canAnalyze}
          title="Analizar equipo"
          className="game-btn bg-panel-2 px-1.5 py-1 text-sm"
        >
          ⚔️
        </button>
        <button
          type="button"
          onClick={onMeta}
          disabled={disabled}
          title="Top del meta"
          className="game-btn bg-panel-2 px-1.5 py-1 text-sm"
        >
          📊
        </button>
      </div>

      {/* Panel desplegable */}
      {open && (
        <aside className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0 lg:w-[216px]">
          {/* Historial */}
          <div className="game-box flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="font-pixel text-[10px] tracking-wide uppercase">Historial</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[10px] text-muted hover:text-poke-red"
                >
                  borrar
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted">
                Aquí quedan tus equipos analizados. Analiza el primero y aparecerá.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectEntry(entry)}
                      title={entry.team.join(", ")}
                      className="game-inset w-full bg-panel px-2 py-1.5 text-left hover:bg-panel-2 disabled:opacity-50"
                    >
                      <span className="flex items-center">
                        {entry.team.slice(0, 6).map((mon) => (
                          <PixelSprite
                            key={mon}
                            pokemon={mon}
                            size={26}
                            className="-ml-1 first:ml-0"
                          />
                        ))}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted tabular-nums">
                        {formatWhen(entry.at)} · {entry.team.length} Pokémon
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Funciones */}
          <div className="game-box p-3">
            <h2 className="font-pixel mb-2 text-[10px] tracking-wide uppercase">Funciones</h2>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={disabled || !canAnalyze}
                className="game-btn w-full bg-panel-2 px-2.5 py-1.5 text-left text-xs"
              >
                Analizar equipo
              </button>
              <button
                type="button"
                onClick={onMeta}
                disabled={disabled}
                className="game-btn w-full bg-panel-2 px-2.5 py-1.5 text-left text-xs"
              >
                Top del meta
              </button>

              {UPCOMING.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-2 rounded border-2 border-dashed border-muted/40 px-2.5 py-1.5 text-xs text-muted"
                  title="Disponible en una próxima fase"
                >
                  <span className="truncate">{f.label}</span>
                  <span className="font-pixel shrink-0 text-[7px] uppercase">🔒 {f.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
