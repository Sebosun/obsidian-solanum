import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CROPS } from "@/lib/crops/catalog";

const GROWTH_STAGES = [1, 2, 3, 4];

/**
 * Shipped models that nothing in `src/` loads. Each needs a reason. If one becomes referenced the
 * test below fails until it is removed from this list, so the list can only shrink.
 */
const UNREFERENCED: Record<string, string> = Object.fromEntries(
  ["Tomato", "Corn"].flatMap((model) =>
    GROWTH_STAGES.map((stage) => [
      `crops/${model}_${stage}.glb`,
      "Quaternius original, superseded by the crops/garden/ models; kept for provenance (see crops/NOTICE.txt)",
    ]),
  ),
);

const files = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
  );

const shipped = files("assets")
  .filter((file) => file.endsWith(".glb"))
  .map((file) => relative("assets", file).split("\\").join("/"))
  .sort();

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Models named as a `group/Name.glb` literal in the code (not in a comment), plus every model the crop catalog implies. */
function referencedModels(): string[] {
  const literal = /["'`]([a-z]+\/[\w.-]+\.glb)["'`]/g;
  const named = files("src")
    .filter((file) => /\.tsx?$/.test(file))
    .flatMap((file) =>
      [...withoutComments(readFileSync(file, "utf8")).matchAll(literal)].map((m) => m[1]),
    );
  const crops = Object.values(CROPS).flatMap((crop) => [
    ...GROWTH_STAGES.map((stage) => `crops/${crop.model}_${stage}.glb`),
    ...("produce" in crop ? [`crops/${crop.produce}.glb`] : []),
  ]);
  return [...new Set([...named, ...crops])].sort();
}

describe("shipped models and the code that loads them", () => {
  const referenced = referencedModels();

  it("finds the models the plugin is known to load", () => {
    expect(referenced).toEqual(
      expect.arrayContaining([
        "stage/Farm_platform.glb",
        "harvest/Crate.glb",
        "break/Cat_sleeping.glb",
        "crops/garden/Tomato_produce.glb",
        "crops/Coconut_4.glb",
      ]),
    );
  });

  it.each(referenced)("ships %s, which the code loads", (model) => {
    expect(existsSync(join("assets", model)), `${model} is referenced but missing`).toBe(true);
  });

  it.each(shipped.filter((model) => !(model in UNREFERENCED)))(
    "has code that loads %s",
    (model) => {
      expect(referenced, `${model} is shipped but nothing loads it`).toContain(model);
    },
  );

  it.each(Object.keys(UNREFERENCED))(
    "still needs its allowlist entry: %s is shipped and unreferenced",
    (model) => {
      expect(shipped, `${model} no longer exists; remove it from UNREFERENCED`).toContain(model);
      expect(referenced, `${model} is now loaded; remove it from UNREFERENCED`).not.toContain(
        model,
      );
    },
  );
});
