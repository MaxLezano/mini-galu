import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// el alias `@/` de tsconfig (el motor de Galú importa vistas de otras features)
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
});
