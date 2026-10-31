import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { exclude: ["node_modules/**", "tests/browser/**"] },
  resolve: {
    alias: { obsidian: fileURLToPath(new URL("./tests/obsidian-stub.ts", import.meta.url)) },
  },
});
