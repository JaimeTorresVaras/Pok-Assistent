import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Carga .env.local (activa los tests de integración si hay credenciales).
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    // Mismo alias que tsconfig ("@/*" -> "src/*") para que Vitest resuelva imports.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
