import * as esbuild from "esbuild";
import { cp, mkdir, copyFile } from "node:fs/promises";

const directory = "/tmp/opencode/solanum-browser";
await mkdir(directory, { recursive: true });
await cp("assets", `${directory}/assets`, { recursive: true });
await cp("assets/crops", `${directory}/native-assets`, { recursive: true });
await copyFile("styles.css", `${directory}/styles.css`);
await copyFile("tests/browser/index.html", `${directory}/index.html`);
const context = await esbuild.context({
  entryPoints: ["tests/browser/harness.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: `${directory}/bundle.js`,
  define: { "process.env.NODE_ENV": '"development"' },
});
await context.serve({ servedir: directory, host: "127.0.0.1", port: 45173 });
async function stop() {
  await context.dispose();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
