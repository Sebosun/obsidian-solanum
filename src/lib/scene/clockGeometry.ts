import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Vector3 } from "three";
import data from "@assets/fonts/bricolage-grotesque-digits.json";
import { formatTime } from "@/lib/time";
import { CLOCK_TYPOGRAPHY } from "@/lib/scene/constants";

const CLOCK_FONT = new FontLoader().parse(data);

export function createCountdownGeometry(remaining: number, size: number): TextGeometry {
  const geometry = new TextGeometry(formatTime(remaining), {
    font: CLOCK_FONT,
    size,
    depth: CLOCK_TYPOGRAPHY.depth,
    curveSegments: CLOCK_TYPOGRAPHY.curveSegments,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
  geometry.translate(-center.x, -center.y, 0);
  return geometry;
}

/** The glyphs the clock can draw, with a stand-in for anything else. */
const glyph = (char: string) =>
  data.glyphs[char as keyof typeof data.glyphs] ?? data.glyphs["?" as keyof typeof data.glyphs];

/** How far the pen moves after drawing `char` at `size`. */
export function clockAdvance(char: string, size: number): number {
  return (glyph(char).ha * size) / data.resolution;
}

/** Where each character's pen starts, so the whole string is centred on zero. */
export function layoutClock(text: string, size: number): number[] {
  const chars = [...text];
  const total = chars.reduce((sum, char) => sum + clockAdvance(char, size), 0);
  let pen = -total / 2;
  return chars.map((char) => {
    const start = pen;
    pen += clockAdvance(char, size);
    return start;
  });
}

/** One character as geometry, with its pen at x = 0 and the digits' middle at y = 0. */
export function createClockGlyph(char: string, size: number): TextGeometry {
  const geometry = new TextGeometry(char, {
    font: CLOCK_FONT,
    size,
    depth: CLOCK_TYPOGRAPHY.depth,
    curveSegments: CLOCK_TYPOGRAPHY.curveSegments,
    bevelEnabled: false,
  });
  const reference = new TextGeometry("0", { font: CLOCK_FONT, size, depth: 0, curveSegments: 4 });
  reference.computeBoundingBox();
  const middle = reference.boundingBox?.getCenter(new Vector3()).y ?? 0;
  reference.dispose();
  geometry.translate(0, -middle, 0);
  return geometry;
}
