import { describe, expect, it } from "vitest";
import { Box3, OrthographicCamera, Vector3 } from "three";
import { fitTimerCamera } from "@/lib/scene/framing";
import { TIMER_SCENE } from "@/lib/scene/constants";

const SIZES: [number, number][] = [
  [160, 900],
  [240, 800],
  [320, 720],
  [560, 300],
  [900, 900],
];

/** The plot as it appears on screen, in normalised device coordinates. */
function plotOnScreen(camera: OrthographicCamera): Box3 {
  const box = new Box3();
  for (const x of [TIMER_SCENE.bounds.min[0], TIMER_SCENE.bounds.max[0]])
    for (const y of [TIMER_SCENE.bounds.min[1], TIMER_SCENE.bounds.max[1]])
      for (const z of [TIMER_SCENE.bounds.min[2], TIMER_SCENE.bounds.max[2]])
        box.expandByPoint(new Vector3(x, y, z).project(camera));
  return box;
}

describe("sidebar camera framing", () => {
  it.each(SIZES)("keeps the whole plot and crop in view at %ix%i", (width, height) => {
    const camera = new OrthographicCamera();
    fitTimerCamera(camera, { width, height });
    const box = plotOnScreen(camera);
    for (const value of [box.min.x, box.max.x, box.min.y, box.max.y])
      expect(Math.abs(value)).toBeLessThanOrEqual(1);
  });

  it.each(SIZES)("holds the plot low and centred, under the sky, at %ix%i", (width, height) => {
    const camera = new OrthographicCamera();
    fitTimerCamera(camera, { width, height });
    const centre = plotOnScreen(camera).getCenter(new Vector3());
    expect(centre.x).toBeCloseTo(0, 6);
    // NDC y runs up, the plot's centre is this fraction of the height down from the top.
    expect(centre.y).toBeCloseTo(1 - 2 * TIMER_SCENE.plotCenter, 6);
  });

  it.each(SIZES)(
    "fills the room it has rather than leaving it mostly empty at %ix%i",
    (width, height) => {
      const camera = new OrthographicCamera();
      fitTimerCamera(camera, { width, height });
      const box = plotOnScreen(camera);
      const usedWidth = (box.max.x - box.min.x) / 2;
      const room = 2 * Math.min(TIMER_SCENE.plotCenter, 1 - TIMER_SCENE.plotCenter);
      const usedHeight = (box.max.y - box.min.y) / 2 / room;
      expect(Math.max(usedWidth, usedHeight)).toBeGreaterThan(0.85);
    },
  );

  it("frames the plot the same way whatever the scene's resolution, only scaled", () => {
    const small = new OrthographicCamera();
    const large = new OrthographicCamera();
    fitTimerCamera(small, { width: 300, height: 600 });
    fitTimerCamera(large, { width: 600, height: 1200 });
    const a = plotOnScreen(small);
    const b = plotOnScreen(large);
    expect(b.min.x).toBeCloseTo(a.min.x, 6);
    expect(b.max.y).toBeCloseTo(a.max.y, 6);
  });

  it("can hold the plot at a different height, for a view with nothing above it", () => {
    for (const centre of [0.5, 0.45]) {
      const camera = new OrthographicCamera();
      fitTimerCamera(camera, { width: 320, height: 720 }, TIMER_SCENE.bounds, centre);
      const middle = plotOnScreen(camera).getCenter(new Vector3());
      expect(middle.y).toBeCloseTo(1 - 2 * centre, 6);
      const box = plotOnScreen(camera);
      for (const value of [box.min.x, box.max.x, box.min.y, box.max.y])
        expect(Math.abs(value)).toBeLessThanOrEqual(1);
    }
  });
});
