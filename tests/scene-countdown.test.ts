import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCountdownGeometry } from "@/lib/scene/clockGeometry";
import font from "@assets/fonts/bricolage-grotesque-digits.json";

const CLOCK_CHARACTERS = [..."0123456789:"];

describe("offline scene typography", () => {
  it("builds complete glyph outlines and centers every duration", () => {
    for (const minutes of [5, 25, 120]) {
      const geometry = createCountdownGeometry(minutes * 60_000, 36);
      geometry.computeBoundingBox();
      const center = geometry.boundingBox!.getCenter(new Vector3());
      expect(center.x).toBeCloseTo(0);
      expect(center.y).toBeCloseTo(0);
      expect(geometry.attributes.position.count).toBeGreaterThan(200);
      expect(geometry.boundingBox!.getSize(new Vector3()).x).toBeLessThan(160);
      geometry.dispose();
    }
  });

  it("is set in Bricolage Grotesque Bold, with an outline for every clock character", () => {
    expect(font.original_font_information.fontFamily).toBe("Bricolage Grotesque");
    expect(font.familyName).toBe("Bricolage Grotesque Bold");
    for (const character of CLOCK_CHARACTERS) {
      const glyph = font.glyphs[character as keyof typeof font.glyphs];
      expect(glyph, `glyph ${character}`).toBeDefined();
      expect(glyph.o.length).toBeGreaterThan(10);
    }
  });

  it("lays digits out with the font's own advance widths", () => {
    const zero = font.glyphs["0"];
    const colon = font.glyphs[":"];
    // "00:00": three zero advances and a colon advance, then the last zero's right edge, minus the first zero's left edge.
    const units = 3 * zero.ha + colon.ha + zero.x_max - zero.x_min;
    const size = 40;
    const geometry = createCountdownGeometry(0, size);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.getSize(new Vector3()).x).toBeCloseTo(
      (units * size) / font.resolution,
      0,
    );
    geometry.dispose();
  });

  it("ships the font with its licence and where it came from, and no leftover typeface", () => {
    const notice = readFileSync("assets/fonts/NOTICE.txt", "utf8");
    const licence = readFileSync("assets/fonts/OFL.txt", "utf8");
    expect(notice).toContain("Bricolage Grotesque");
    expect(notice).toMatch(/SIL Open Font License 1\.1/);
    expect(notice).toContain("fontsource.org/fonts/bricolage-grotesque");
    expect(licence).toContain("The Bricolage Grotesque Project Authors");
    expect(licence).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(() => readFileSync("assets/fonts/inter-digits.json")).toThrow();
  });
});
