import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the clock's bundled typography", () => {
  const font = readFileSync("assets/fonts/bricolage-grotesque-digits.woff2");

  it("is a small woff2 subset, so it can ship inside the plugin", () => {
    expect(font.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(font.length).toBeLessThan(10_000);
  });

  it("ships with its licence and where it came from, and no leftover typeface", () => {
    const notice = readFileSync("assets/fonts/NOTICE.txt", "utf8");
    const licence = readFileSync("assets/fonts/OFL.txt", "utf8");
    expect(notice).toContain("Bricolage Grotesque");
    expect(notice).toMatch(/SIL Open Font License 1\.1/);
    expect(notice).toContain("fontsource.org/fonts/bricolage-grotesque");
    expect(notice).toContain("pyftsubset");
    expect(licence).toContain("The Bricolage Grotesque Project Authors");
    expect(licence).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(() => readFileSync("assets/fonts/inter-digits.json")).toThrow();
    expect(() => readFileSync("assets/fonts/bricolage-grotesque-digits.json")).toThrow();
  });

  it("is built into the plugin as a data URL, not fetched", () => {
    expect(readFileSync("esbuild.config.mjs", "utf8")).toMatch(/\.woff2["']:\s*["']dataurl["']/);
  });
});
