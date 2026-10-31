import { Box3, Vector3, type Object3D } from "three";

/** Ground each stage, but normalize against maturity so a sprout stays smaller. */
export function preparePlant(scene: Object3D, mature: Object3D) {
  const object = scene.clone(true);
  const box = new Box3().setFromObject(object);
  object.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const size = new Box3().setFromObject(mature).getSize(new Vector3());
  return { object, factor: 1.8 / Math.max(size.x, size.y, size.z, 0.001) };
}
