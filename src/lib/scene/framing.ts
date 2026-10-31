import type { OrthographicCamera } from "three";
import { Box3, Vector3 } from "three";
import { SUN_CLOCK, TIMER_SCENE } from "@/lib/scene/constants";

export interface SceneSize {
  width: number;
  height: number;
}

/** Fits the plot, the crop and the whole sun clock behind them into the scene, centred. */
export function fitTimerCamera(camera: OrthographicCamera, size: SceneSize): void {
  const plot = new Box3(
    new Vector3(...TIMER_SCENE.bounds.min),
    new Vector3(...TIMER_SCENE.bounds.max),
  );
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
  view.expandByPoint(
    new Vector3(-SUN_CLOCK.boardHalfWidth, SUN_CLOCK.boardBottom, -TIMER_SCENE.cameraDistance),
  );
  view.expandByPoint(
    new Vector3(SUN_CLOCK.boardHalfWidth, SUN_CLOCK.boardTop, -TIMER_SCENE.cameraDistance),
  );
  const extent = view.getSize(new Vector3());
  camera.zoom = Math.min(size.width / extent.x, size.height / extent.y) / TIMER_SCENE.padding;
  camera.left = -size.width / 2;
  camera.right = size.width / 2;
  camera.top = size.height / 2;
  camera.bottom = -size.height / 2;
  camera.near = TIMER_SCENE.near;
  camera.far = TIMER_SCENE.far;

  const centre = view.getCenter(new Vector3());
  camera.position
    .addScaledVector(new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), centre.x)
    .addScaledVector(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion), centre.y);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}
