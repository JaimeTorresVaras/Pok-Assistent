import { TeamBuilder } from "@/components/TeamBuilder";
import { getContainer } from "@/composition/container";

/** Regulación activa (parametrizable; ver PLAN.md §0). */
const REGULATION = "M-B";

/**
 * El top del meta sale de la DB (usage_stats, recalculado por la ingesta),
 * así que la página se renderiza por petición en vez de congelarse en build.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const container = getContainer();
  const legalMons = container.legality.listLegal(REGULATION);
  const threats = await container.meta.topThreats(REGULATION, 10);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Champions EV AI</h1>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Regulación {REGULATION}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Elige hasta 6 Pokémon y recibe spreads de EVs, ítems y movimientos pensados contra el meta
          — con cada número verificado por el motor de daño, nunca inventado.
        </p>
      </header>

      <TeamBuilder regulation={REGULATION} legalMons={legalMons} threats={threats} />
    </main>
  );
}
