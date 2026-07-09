/**
 * Aplica las migraciones SQL de db/migrations/ en orden, una sola vez cada
 * una (registro en la tabla _migrations). Uso: `npm run db:migrate`.
 * Lee DATABASE_URL del entorno o de .env.local.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

// Cargar .env.local si existe (Node no lo hace solo fuera de Next).
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith("#") && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (en el entorno o en .env.local).");
  console.error("Supabase: Project Settings → Database → Connection string (URI).");
  process.exit(1);
}

// prepare:false para ser compatible con el pooler de Supabase (PgBouncer).
const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied = new Set((await sql`select name from _migrations`).map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (ya aplicada)`);
      continue;
    }
    console.log(`> aplicando ${file}...`);
    await sql.unsafe(readFileSync(join(dir, file), "utf8"));
    await sql`insert into _migrations (name) values (${file})`;
    console.log(`✓ ${file}`);
  }
  console.log("Migraciones al día.");
} finally {
  await sql.end({ timeout: 5 });
}
