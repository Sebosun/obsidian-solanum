import * as esbuild from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const production = process.argv.includes("--production");
const env = {};
for (const path of [".env", ...(!production ? [".env.development"] : []), ".env.local"]) {
  if (existsSync(path)) Object.assign(env, parse(readFileSync(path)));
}
Object.assign(env, process.env);

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  platform: "browser",
  target: "es2020",
  outfile: "main.js",
  sourcemap: production ? false : "inline",
  minify: production,
  define: {
    // Raw inputs only: src/lib/debug/config.ts decides, so the production gate is tested code.
    __SOLANUM_DEBUG__: JSON.stringify(env.SOLANUM_DEBUG ?? ""),
    __SOLANUM_AUTO_FINISH_SECONDS__: JSON.stringify(env.SOLANUM_AUTO_FINISH_SECONDS ?? ""),
    __SOLANUM_PRODUCTION__: JSON.stringify(production),
    "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development"),
  },
  loader: { ".woff2": "dataurl" },
  logLevel: "info",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  const cliPackage = new URL(import.meta.resolve("@tailwindcss/cli/package.json"));
  const cliBin = JSON.parse(readFileSync(cliPackage, "utf8")).bin.tailwindcss;
  const css = spawn(
    process.execPath,
    [
      fileURLToPath(new URL(cliBin, cliPackage)),
      "-i",
      "src/styles.css",
      "-o",
      "styles.css",
      "--watch=always",
    ],
    { stdio: "inherit" },
  );
  css.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Tailwind exited with code ${code}`);
      process.exit(code);
    }
  });
  const stop = async () => {
    css.kill();
    await context.dispose();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("exit", () => css.kill());
  await context.watch();
}
