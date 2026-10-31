import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Usage: node scripts/prepare-clock-font.mjs <font.ttf|.woff> <output.json>
// Writes the countdown glyphs as a three.js font, so the clock needs no font file at runtime.
const loaderPath = join(tmpdir(), "solanum-font-loader.cjs");
await build({
  stdin: {
    contents: 'export { TTFLoader } from "three/addons/loaders/TTFLoader.js";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: loaderPath,
  plugins: [
    {
      name: "offline-opentype",
      setup(builder) {
        builder.onResolve({ filter: /^https:.*opentype/ }, () => ({
          path: fileURLToPath(import.meta.resolve("opentype.js")),
        }));
      },
    },
  ],
});
const { TTFLoader } = (await import(loaderPath)).default;

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Pass a local TTF or WOFF file and the output JSON path.");
const bytes = await readFile(source);
const data = new TTFLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const glyphs = Object.fromEntries(
  [..."0123456789:?"].map((character) => [character, data.glyphs[character]]),
);
await mkdir(dirname(output), { recursive: true });
const information = Object.fromEntries(
  Object.entries(data.original_font_information).map(([name, translations]) => [
    name,
    translations.en ?? Object.values(translations)[0],
  ]),
);
await writeFile(
  output,
  JSON.stringify({ ...data, glyphs, original_font_information: information }),
);
