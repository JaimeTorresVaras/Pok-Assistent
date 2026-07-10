import { ChampionsChat } from "@/components/ChampionsChat";
import { getContainer } from "@/composition/container";

/** Regulación activa (parametrizable; ver PLAN.md §0). */
const REGULATION = "M-B";

/**
 * El meta sale de la DB (usage_stats, recalculado por la ingesta), así que
 * la página se renderiza por petición en vez de congelarse en build.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const container = getContainer();
  const legalMons = container.legality.listLegal(REGULATION);
  // 40 amenazas: el top-10 para el ranking y el resto para fichas del chat.
  const threats = await container.meta.topThreats(REGULATION, 40);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:min-h-0">
      {/* Header en una línea: la descripción vive dentro del chat. */}
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="font-pixel text-sm tracking-tight sm:text-base">
          Champions <span className="text-poke-red">EV</span>{" "}
          <span className="text-poke-blue">AI</span>
        </h1>
        <span className="game-inset px-2.5 py-1 text-[10px] font-semibold uppercase">
          Reg. {REGULATION} · VGC dobles
        </span>
      </header>

      <ChampionsChat regulation={REGULATION} legalMons={legalMons} threats={threats} />
    </main>
  );
}
