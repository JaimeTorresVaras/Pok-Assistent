/**
 * Herramienta de debug del RAG: recupera sets de torneo por similitud.
 *
 *   npm run rag:query -- --pokemon=Garchomp
 *   npm run rag:query -- --pokemon=Kingambit --k=3 --regulation=M-B
 *
 * Necesita DATABASE_URL y VOYAGE_API_KEY (entorno o .env.local).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PgTournamentStore } from "@/adapters/postgres/pgTournamentStore";
import { VoyageEmbeddingsAdapter } from "@/adapters/voyage/voyageEmbeddingsAdapter";
import { RetrieveSets } from "@/core/usecases/retrieveSets";

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

const pokemon = arg("pokemon", "");
const regulation = arg("regulation", "M-B");
const k = Number(arg("k", "5"));

if (!pokemon || !process.env.DATABASE_URL || !process.env.VOYAGE_API_KEY) {
  console.error("Uso: npm run rag:query -- --pokemon=Garchomp [--k=5] [--regulation=M-B]");
  console.error("(necesita DATABASE_URL y VOYAGE_API_KEY en .env.local)");
  process.exit(1);
}

const store = new PgTournamentStore(process.env.DATABASE_URL);
const retrieval = new RetrieveSets(
  new VoyageEmbeddingsAdapter(process.env.VOYAGE_API_KEY, { model: process.env.VOYAGE_MODEL }),
  store,
);

async function main(): Promise<void> {
  try {
    const docs = await retrieval.retrieve({ pokemon, regulation, k });
    console.log(`${docs.length} documento(s) recuperados para ${pokemon} (${regulation}):\n`);
    for (const doc of docs) {
      console.log(`— ${doc.id}`);
      console.log(`  ${doc.text}\n`);
    }
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error("rag:query falló:", error);
  process.exitCode = 1;
});
