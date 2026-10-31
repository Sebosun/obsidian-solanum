import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const loaderPath = "/tmp/opencode/solanum-font-loader.cjs";
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

const source = process.argv[2];
if (!source) throw new Error("Pass a local Inter TTF file.");
const bytes = await readFile(source);
const data = new TTFLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const glyphs = Object.fromEntries(
  [..."0123456789:?"].map((character) => [character, data.glyphs[character]]),
);
await mkdir("assets/fonts", { recursive: true });
const information = Object.fromEntries(
  Object.entries(data.original_font_information).map(([name, translations]) => [
    name,
    translations.en ?? Object.values(translations)[0],
  ]),
);
await writeFile(
  "assets/fonts/inter-digits.json",
  JSON.stringify({ ...data, glyphs, original_font_information: information }),
);
