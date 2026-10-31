import type { OrthographicCamera } from "three";
import { Box3, Vector3 } from "three";
import { TIMER_SCENE } from "@/lib/scene/constants";

/** The box the camera has to keep in view, as corner coordinates. */
export interface SceneBounds {
  readonly min: readonly number[];
  readonly max: readonly number[];
}

export interface SceneSize {
  width: number;
  height: number;
}

/**
 * Fits the plot and the crop into the scene, with the middle of the plot at a fixed height so the
 * sky above it keeps its room. The sun clock is not part of this: it is drawn in the page.
 */
export function fitTimerCamera(
  camera: OrthographicCamera,
  size: SceneSize,
  bounds: SceneBounds = TIMER_SCENE.bounds,
  /** How far down the scene the middle of the view sits, as a fraction of its height. */
  center: number = TIMER_SCENE.plotCenter,
): void {
  const plot = new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
  const target = new Vector3(...TIMER_SCENE.target);
  const direction = new Vector3(...TIMER_SCENE.direction)
    .normalize()
    .multiplyScalar(TIMER_SCENE.cameraDistance);
  camera.position.copy(target).add(direction);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  // Everything that must be visible, in the camera's own screen plane.
  const view = new Box3();
  for (const x of [plot.min.x, plot.max.x])
    for (const y of [plot.min.y, plot.max.y])
      for (const z of [plot.min.z, plot.max.z])
        view.expandByPoint(new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  const extent = view.getSize(new Vector3());
  // The plot is centred at `plotCenter`, so it can use only as much height as fits on both sides.
  const roomHeight = 2 * Math.min(center, 1 - center) * size.height;
  camera.zoom = Math.min(size.width / extent.x, roomHeight / extent.y) / TIMER_SCENE.padding;
  camera.left = -size.width / 2;
  camera.right = size.width / 2;
  camera.top = size.height / 2;
  camera.bottom = -size.height / 2;
  camera.near = TIMER_SCENE.near;
  camera.far = TIMER_SCENE.far;

  // Look a little above the plot, so that the plot lands below the middle of the scene.
  const centre = view.getCenter(new Vector3());
  const lift = ((center - 0.5) * size.height) / camera.zoom;
  camera.position
    .addScaledVector(new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), centre.x)
    .addScaledVector(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion), centre.y + lift);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}
