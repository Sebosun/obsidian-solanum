import { BufferAttribute, BufferGeometry } from "three";

export interface PillowShape {
  width: number;
  depth: number;
  height: number;
  /** Grid cells along each side of the top and of the bottom. */
  segments?: number;
}

/** How quickly the cushion swells from its seam towards the middle, and how steeply it falls away. */
const OUTLINE = 2.4;
const SWELL = 0.8;
/** How much the square footprint is rounded towards an oval (0 is a rectangle, 1 an oval). */
const ROUNDNESS = 0.75;
/** The soft dent where a pillow gives under its middle. */
const DENT = { depth: 0.07, spread: 0.1 };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function pillowGeometry({
  width,
  depth,
  height,
  segments = 28,
}: PillowShape): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const side = segments + 1;
  // Thickness depends on how close a point is to the seam, measured by a rounded-square distance,
  // so the cushion thins evenly all the way round instead of only towards its straight sides.
  const bulge = (u: number, v: number) => {
    const edge = (u ** 4 + v ** 4) ** 0.25;
    return Math.pow(Math.max(0, 1 - edge ** OUTLINE), SWELL);
  };
  for (const face of [1, -1]) {
    for (let j = 0; j <= segments; j += 1) {
      for (let i = 0; i <= segments; i += 1) {
        const u = (i / segments) * 2 - 1;
        const v = (j / segments) * 2 - 1;
        let y = (face * height * bulge(u, v)) / 2;
        if (face === 1)
          y -= DENT.depth * height * Math.exp(-(u * u + v * v) / DENT.spread) * bulge(u, v);
        // Pull the corners in towards an oval, so the outline is soft instead of a sharp rectangle.
        const x = u * lerp(1, Math.sqrt(1 - (v * v) / 2), ROUNDNESS);
        const z = v * lerp(1, Math.sqrt(1 - (u * u) / 2), ROUNDNESS);
        positions.push((x * width) / 2, y + height / 2, (z * depth) / 2);
      }
    }
  }
  const bottom = side * side;
  const quad = (offset: number, flip: boolean) => {
    for (let j = 0; j < segments; j += 1)
      for (let i = 0; i < segments; i += 1) {
        const a = offset + j * side + i;
        const b = a + 1;
        const c = a + side;
        const d = c + 1;
        if (flip) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
  };
  quad(0, false);
  quad(bottom, true);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
