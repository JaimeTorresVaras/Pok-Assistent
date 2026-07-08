import type { ThreatMon } from "@/core/domain/model";

interface Props {
  threats: ThreatMon[];
}

/** Panel lateral con el top del meta (uso %, movimientos top). (PLAN.md §7.) */
export function ThreatsPanel({ threats }: Props) {
  return (
    <aside className="h-fit rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        Top del meta
      </h2>
      {threats.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin datos de uso para esta regulación.</p>
      ) : (
        <ul className="space-y-3">
          {threats.map((t) => (
            <li key={t.pokemon}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{t.pokemon}</span>
                <span className="font-mono text-xs text-neutral-500 tabular-nums">
                  {t.usagePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, t.usagePct)}%` }}
                />
              </div>
              <p className="mt-1 truncate text-xs text-neutral-500">
                {t.moves
                  .slice(0, 3)
                  .map((m) => m.name)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 border-t border-neutral-200 pt-3 text-[11px] leading-relaxed text-neutral-400 dark:border-neutral-800">
        ⚠️ Datos de uso placeholder: se reemplazarán por el top real de la regulación (y luego por
        la ingesta automática de torneos, Fase 5).
      </p>
    </aside>
  );
}
