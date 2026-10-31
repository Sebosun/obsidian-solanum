import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { pillowGeometry } from "@/lib/scene/pillow";

const shape = { width: 1.5, depth: 1.2, height: 0.34 };

describe("the pillow", () => {
  const geometry = pillowGeometry(shape);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as Box3;
  const size = box.getSize(new Vector3());

  it("is as big as asked, sitting on the ground", () => {
    expect(size.x).toBeCloseTo(shape.width, 6);
    expect(size.z).toBeCloseTo(shape.depth, 6);
    expect(size.y).toBeGreaterThan(shape.height * 0.6);
    expect(size.y).toBeLessThanOrEqual(shape.height + 1e-6);
    expect(box.min.y).toBeCloseTo(0, 6);
  });

  it("is plump in the middle and pinched to a seam at the edge", () => {
    const position = geometry.getAttribute("position");
    let middle = 0;
    let edge = Infinity;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i) / (shape.width / 2);
      const z = position.getZ(i) / (shape.depth / 2);
      const thickness = Math.abs(position.getY(i) - shape.height / 2);
      if (Math.hypot(x, z) < 0.3) middle = Math.max(middle, thickness);
      if (Math.max(Math.abs(x), Math.abs(z)) > 0.999) edge = Math.min(edge, thickness);
    }
    expect(middle).toBeGreaterThan(shape.height * 0.3);
    expect(edge).toBeLessThan(0.001);
  });

  it("gives a little under its middle, where the cat lies", () => {
    const position = geometry.getAttribute("position");
    let centre = -Infinity;
    let shoulder = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      if (position.getY(i) < shape.height / 2) continue;
      const r = Math.hypot(
        position.getX(i) / (shape.width / 2),
        position.getZ(i) / (shape.depth / 2),
      );
      if (r < 0.05) centre = Math.max(centre, position.getY(i));
      if (r > 0.35 && r < 0.45) shoulder = Math.max(shoulder, position.getY(i));
    }
    expect(centre).toBeLessThan(shoulder);
  });

  it("is a closed, smoothly shaded surface with outward normals", () => {
    const normals = geometry.getAttribute("normal");
    const position = geometry.getAttribute("position");
    let outward = 0;
    for (let i = 0; i < position.count; i += 1) {
      const point = new Vector3(
        position.getX(i),
        position.getY(i) - shape.height / 2,
        position.getZ(i),
      );
      const normal = new Vector3(normals.getX(i), normals.getY(i), normals.getZ(i));
      if (point.lengthSq() > 0.01 && normal.dot(point) > 0) outward += 1;
    }
    expect(outward).toBeGreaterThan(position.count * 0.85);
    expect(geometry.index?.count).toBe(28 * 28 * 6 * 2);
  });
});
