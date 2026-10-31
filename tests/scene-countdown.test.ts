import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCountdownGeometry } from "@/lib/scene/clockGeometry";

describe("offline scene typography", () => {
  it("builds complete Inter glyph outlines and centers every duration", () => {
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
});
