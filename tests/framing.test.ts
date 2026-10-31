import { describe, expect, it } from "vitest";
import { OrthographicCamera, Vector3 } from "three";
import { fitTimerCamera } from "@/lib/scene/framing";
import { SUN_CLOCK, TIMER_SCENE } from "@/lib/scene/constants";

/** A point on the clock's board, which hangs at a fixed place in the world, in the camera's screen plane. */
function boardPoint(camera: OrthographicCamera, x: number, y: number): Vector3 {
  const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  return new Vector3(...TIMER_SCENE.target).addScaledVector(right, x).addScaledVector(up, y);
}

const SIZES: [number, number][] = [
  [160, 900],
  [240, 800],
  [320, 720],
  [560, 300],
  [900, 900],
];

describe("sidebar camera framing", () => {
  it.each(SIZES)(
    "keeps the plot, the crop and the whole sun clock in view at %ix%i",
    (width, height) => {
      const camera = new OrthographicCamera();
      fitTimerCamera(camera, { width, height });
      const visible = (point: Vector3) => {
        const projected = point.project(camera);
        expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
      };
      for (const x of [TIMER_SCENE.bounds.min[0], TIMER_SCENE.bounds.max[0]])
        for (const y of [TIMER_SCENE.bounds.min[1], TIMER_SCENE.bounds.max[1]])
          for (const z of [TIMER_SCENE.bounds.min[2], TIMER_SCENE.bounds.max[2]])
            visible(new Vector3(x, y, z));
      for (const x of [-SUN_CLOCK.boardHalfWidth, SUN_CLOCK.boardHalfWidth])
        for (const y of [SUN_CLOCK.boardBottom, SUN_CLOCK.boardTop])
          visible(boardPoint(camera, x, y));
    },
  );

  it.each(SIZES)(
    "fills the scene rather than leaving it mostly empty at %ix%i",
    (width, height) => {
      const camera = new OrthographicCamera();
      fitTimerCamera(camera, { width, height });
      const left = camera
        .localToWorld(new Vector3(-SUN_CLOCK.boardHalfWidth, 0, -TIMER_SCENE.cameraDistance))
        .project(camera);
      const top = camera
        .localToWorld(new Vector3(0, SUN_CLOCK.boardTop, -TIMER_SCENE.cameraDistance))
        .project(camera);
      const bottom = camera
        .localToWorld(new Vector3(0, SUN_CLOCK.boardBottom, -TIMER_SCENE.cameraDistance))
        .project(camera);
      // The limiting dimension uses most of the scene.
      const usedWidth = Math.abs(left.x);
      const usedHeight = Math.max(Math.abs(top.y), Math.abs(bottom.y));
      expect(Math.max(usedWidth, usedHeight)).toBeGreaterThan(0.85);
    },
  );

  it("centres the framed area on screen", () => {
    const camera = new OrthographicCamera();
    fitTimerCamera(camera, { width: 320, height: 720 });
    const leftEdge = camera
      .localToWorld(new Vector3(-SUN_CLOCK.boardHalfWidth, 0, -TIMER_SCENE.cameraDistance))
      .project(camera);
    const rightEdge = camera
      .localToWorld(new Vector3(SUN_CLOCK.boardHalfWidth, 0, -TIMER_SCENE.cameraDistance))
      .project(camera);
    expect(leftEdge.x + rightEdge.x).toBeCloseTo(0, 6);
  });
});
