import { describe, expect, it } from "vitest";
import { OrthographicCamera, Vector3 } from "three";
import { fitTimerCamera } from "@/lib/scene/framing";
import { TIMER_SCENE } from "@/lib/scene/constants";

describe("sidebar camera framing", () => {
  it.each([
    [160, 900],
    [320, 720],
    [560, 300],
  ])("keeps the whole plot above the clock at %ix%i", (width, height) => {
    const camera = new OrthographicCamera();
    fitTimerCamera(camera, { width, height });
    for (const x of [TIMER_SCENE.bounds.min[0], TIMER_SCENE.bounds.max[0]]) {
      for (const y of [TIMER_SCENE.bounds.min[1], TIMER_SCENE.bounds.max[1]]) {
        for (const z of [TIMER_SCENE.bounds.min[2], TIMER_SCENE.bounds.max[2]]) {
          const point = new Vector3(x, y, z).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(1);
          expect(point.y).toBeLessThan(1);
          expect(((point.y + 1) * height) / 2).toBeGreaterThan(TIMER_SCENE.clockReservedPixels);
        }
      }
    }
  });
});
