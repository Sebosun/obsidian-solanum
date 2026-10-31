import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const require = createRequire(import.meta.url);

/** A package's ES module entry, from the `module` field of its package.json. */
function esmEntry(name: string): string {
  const manifest = require.resolve(`${name}/package.json`);
  const { module } = JSON.parse(readFileSync(manifest, "utf8")) as { module: string };
  return join(dirname(manifest), module);
}

/**
 * Packages whose CommonJS/UMD build `require`s three, which prints THREE_CJS_DEPRECATED on every
 * run: the @react-three packages and the helpers drei pulls in. They are aliased to their ES module
 * builds and inlined, so vite loads those and three is imported the supported way. A new
 * dependency that brings the warning back is added here.
 */
const THREE_USERS = [
  "@react-three/fiber",
  "@react-three/drei",
  "@react-three/test-renderer",
  "maath",
  "meshline",
  "three-mesh-bvh",
  "troika-three-text",
  "troika-three-utils",
];

export default defineConfig({
  test: {
    exclude: ["node_modules/**", "tests/browser/**"],
    server: { deps: { inline: THREE_USERS.map((name) => new RegExp(`/node_modules/${name}/`)) } },
  },
  resolve: {
    alias: [
      ...THREE_USERS.map((name) => ({
        find: new RegExp(`^${name}$`),
        replacement: esmEntry(name),
      })),
      { find: "obsidian", replacement: local("./tests/obsidian-stub.ts") },
      { find: "@assets", replacement: local("./assets") },
      { find: "@", replacement: local("./src") },
    ],
  },
});
