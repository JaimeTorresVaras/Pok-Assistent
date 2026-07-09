import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Carga .env.local en process.env antes de cada archivo de tests, para que
 * los tests de integración (gated por DATABASE_URL / VOYAGE_API_KEY) corran
 * automáticamente cuando las credenciales existen. No imprime valores.
 */
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !line.trim().startsWith("#") && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
