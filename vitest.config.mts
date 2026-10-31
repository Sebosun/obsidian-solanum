import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { exclude: ["node_modules/**", "tests/browser/**"] },
  resolve: {
    alias: {
      obsidian: fileURLToPath(new URL("./tests/obsidian-stub.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@assets": fileURLToPath(new URL("./assets", import.meta.url)),
    },
  },
});
