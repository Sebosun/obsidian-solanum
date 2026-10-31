import * as esbuild from "esbuild";
import { cp, copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "solanum-browser-"));
await cp("assets", `${directory}/assets`, { recursive: true });
await cp("assets", `${directory}/native-assets`, { recursive: true });
await copyFile("styles.css", `${directory}/styles.css`);
await copyFile("tests/browser/index.html", `${directory}/index.html`);
const context = await esbuild.context({
  entryPoints: ["tests/browser/harness.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: `${directory}/bundle.js`,
  loader: { ".woff2": "dataurl" },
  define: { "process.env.NODE_ENV": '"development"' },
});
await context.serve({ servedir: directory, host: "127.0.0.1", port: 45173 });
async function stop() {
  await context.dispose();
  await rm(directory, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
