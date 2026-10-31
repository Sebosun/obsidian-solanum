import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BLENDER = process.env.SOLANUM_BLENDER ?? "blender";
const hasBlender = spawnSync(BLENDER, ["--version"], { stdio: "ignore" }).status === 0;
const hasPython = spawnSync("python3", ["--version"], { stdio: "ignore" }).status === 0;
const BLENDER_TIMEOUT_MS = 120_000;

interface BlenderModel {
  script: string;
  args: string[];
  /** Files the script writes, relative to its output folder, and where they are committed. */
  outputs: Record<string, string>;
}

const garden = (family: string, name: string): BlenderModel => ({
  script: "scripts/build-garden-crops.py",
  args: ["--", family],
  outputs: Object.fromEntries(
    [1, 2, 3, 4, "produce"].map((stage) => [
      `garden/${name}_${stage}.glb`,
      `assets/crops/garden/${name}_${stage}.glb`,
    ]),
  ),
});

const MODELS: Record<string, BlenderModel> = {
  "the farm platform": {
    script: "scripts/build-farm-platform.py",
    args: [],
    outputs: { "Farm_platform.glb": "assets/stage/Farm_platform.glb" },
  },
  "the harvest crate": {
    script: "scripts/build-harvest-crate.py",
    args: [],
    outputs: { "Crate.glb": "assets/harvest/Crate.glb" },
  },
  "the garden tomato": garden("tomato", "Tomato"),
  "the garden corn": garden("corn", "Corn"),
  "the garden apple": garden("apple", "Apple"),
};

describe("Blender-built models", () => {
  // Without Blender the rebuild tests are reported as skipped, with the reason in their name.
  const rebuild = it.skipIf(!hasBlender);
  const suffix = hasBlender ? "" : " (SKIPPED: blender is not on PATH; set SOLANUM_BLENDER)";

  rebuild.each(Object.entries(MODELS))(
    `rebuilds %s byte for byte from its script${suffix}`,
    { timeout: BLENDER_TIMEOUT_MS },
    (_label, model) => {
      const directory = mkdtempSync(join(tmpdir(), "solanum-blender-"));
      try {
        execFileSync(BLENDER, ["--background", "--python", model.script, ...model.args], {
          env: { ...process.env, SOLANUM_ASSET_OUT: directory },
          stdio: "ignore",
        });
        for (const [built, committed] of Object.entries(model.outputs)) {
          const identical = readFileSync(join(directory, built)).equals(readFileSync(committed));
          expect(identical, `${committed} differs from what its script builds`).toBe(true);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!hasPython)(
    `keeps every Python script syntactically valid${hasPython ? "" : " (SKIPPED: python3 not found)"}`,
    () => {
      const scripts = readdirSync("scripts").filter((file) => file.endsWith(".py"));
      expect(scripts).toContain("blender_common.py");
      const directory = mkdtempSync(join(tmpdir(), "solanum-pyc-"));
      try {
        for (const script of scripts) {
          // Compile to a scratch file so no __pycache__ appears in the repository.
          execFileSync(
            "python3",
            [
              "-c",
              "import sys, py_compile; py_compile.compile(sys.argv[1], cfile=sys.argv[2], doraise=True)",
              `scripts/${script}`,
              join(directory, `${script}c`),
            ],
            { stdio: "pipe" },
          );
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
