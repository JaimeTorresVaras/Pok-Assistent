/**
 * Punto de entrada del pipeline de ingesta (Fase 5). Uso:
 *
 *   npm run ingest                                  # defaults (3 torneos, top 16)
 *   npm run ingest -- --max-tournaments=1 --max-placement=8
 *
 * En Railway se ejecuta como servicio cron del mismo repo (comando
 * `npm run ingest` + cron schedule). Necesita DATABASE_URL y VOYAGE_API_KEY.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PikalyticsLimitlessSource } from "@/adapters/pikalytics/pikalyticsLimitlessSource";
import { PgTournamentStore } from "@/adapters/postgres/pgTournamentStore";
import { PkmnPokedexAdapter } from "@/adapters/pkmn/pkmnPokedexAdapter";
import { StaticRegulationData } from "@/adapters/static/staticRegulationData";
import { VoyageEmbeddingsAdapter } from "@/adapters/voyage/voyageEmbeddingsAdapter";
import { IngestTournamentsUseCase } from "@/core/usecases/ingestTournaments";
import { LegalityService } from "@/core/usecases/legality";

// Cargar .env.local (fuera de Next nadie lo hace por nosotros).
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith("#") && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function arg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=")[1] : fallback;
}

const regulation = arg("regulation", "M-B");
const maxTournaments = Number(arg("max-tournaments", "3"));
const maxPlacement = Number(arg("max-placement", "16"));

const databaseUrl = process.env.DATABASE_URL;
const voyageKey = process.env.VOYAGE_API_KEY;
if (!databaseUrl || !voyageKey) {
  console.error("Faltan DATABASE_URL y/o VOYAGE_API_KEY (entorno o .env.local).");
  process.exit(1);
}

const store = new PgTournamentStore(databaseUrl);
const regulations = new StaticRegulationData();
const usecase = new IngestTournamentsUseCase({
  source: new PikalyticsLimitlessSource(),
  store,
  embeddings: new VoyageEmbeddingsAdapter(voyageKey, {
    model: process.env.VOYAGE_MODEL,
    // El free tier de Voyage limita a 10K tokens/min: lotes chicos + retry 429.
    maxBatch: Number(process.env.VOYAGE_MAX_BATCH ?? "64"),
  }),
  legality: new LegalityService(new PkmnPokedexAdapter(), regulations),
  regulations,
});

async function main(): Promise<void> {
  console.log(
    `Ingesta ${regulation}: hasta ${maxTournaments} torneo(s) nuevos, top ${maxPlacement}...`,
  );

  try {
    const summary = await usecase.exec({
      regulation,
      now: new Date().toISOString().slice(0, 10),
      maxTournaments,
      maxPlacement,
    });

    console.log("\n=== Resumen de la ingesta ===");
    console.log(`Torneos procesados : ${summary.tournamentsProcessed.length}`);
    for (const slug of summary.tournamentsProcessed) console.log(`  · ${slug}`);
    console.log(`Equipos            : ${summary.teams}`);
    console.log(`Docs upserted      : ${summary.docsUpserted}`);
    console.log(`Docs embebidos     : ${summary.docsEmbedded} (solo nuevos)`);
    console.log(`Usage recalculado  : ${summary.usageRows} Pokémon`);
    if (summary.monsSkipped.length > 0) {
      console.log(`Mons saltados      : ${summary.monsSkipped.join(", ")} (fuera de allowlist)`);
    }
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error("Ingesta fallida:", error);
  process.exitCode = 1;
});
