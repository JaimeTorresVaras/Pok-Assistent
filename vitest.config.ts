import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    // Mismo alias que tsconfig ("@/*" -> "src/*") para que Vitest resuelva imports.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
