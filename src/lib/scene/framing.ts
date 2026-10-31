import type { OrthographicCamera } from "three";
import { Box3, Vector3 } from "three";
import { TIMER_SCENE } from "@/lib/scene/constants";

export interface SceneSize {
  width: number;
  height: number;
}

export function fitTimerCamera(camera: OrthographicCamera, size: SceneSize): void {
  const bounds = new Box3(
    new Vector3(...TIMER_SCENE.bounds.min),
    new Vector3(...TIMER_SCENE.bounds.max),
  );
  const center = bounds.getCenter(new Vector3());
  const direction = new Vector3(...TIMER_SCENE.direction)
    .normalize()
    .multiplyScalar(TIMER_SCENE.cameraDistance);
  camera.position.copy(center).add(direction);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const projectedSize = bounds
    .clone()
    .applyMatrix4(camera.matrixWorldInverse)
    .getSize(new Vector3());
  const availableHeight = Math.max(1, size.height - TIMER_SCENE.clockReservedPixels);
  camera.zoom =
    Math.min(size.width / projectedSize.x, availableHeight / projectedSize.y) / TIMER_SCENE.padding;
  camera.left = -size.width / 2;
  camera.right = size.width / 2;
  camera.top = size.height / 2;
  camera.bottom = -size.height / 2;
  camera.near = TIMER_SCENE.near;
  camera.far = TIMER_SCENE.far;
  const offset = new Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .multiplyScalar(-TIMER_SCENE.clockReservedPixels / (2 * camera.zoom));
  camera.position.add(offset);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}
