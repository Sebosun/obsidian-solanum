import { Box3, Vector3, type Object3D } from "three";

export interface PreparedPlant {
  object: Object3D;
  factor: number;
}

/** The longest side of a mature plant, in scene units. */
const PLANT_SIZE = 1.8;
/** The longest side of a pile of produce, in the same units as a plant. */
const PRODUCE_SIZE = 1.3;
/** Stops a flat or empty model from dividing by zero when sizing it. */
const MIN_EXTENT = 0.001;

/** Ground a pile of produce and size it by itself, since it has no growth stages to compare with. */
export function prepareProduce(scene: Object3D): PreparedPlant {
  const object = scene.clone(true);
  const box = new Box3().setFromObject(object);
  object.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const size = box.getSize(new Vector3());
  return { object, factor: PRODUCE_SIZE / Math.max(size.x, size.y, size.z, MIN_EXTENT) };
}

/** Ground each stage, but normalize against maturity so a sprout stays smaller. */
export function preparePlant(scene: Object3D, mature: Object3D): PreparedPlant {
  const object = scene.clone(true);
  const box = new Box3().setFromObject(object);
  object.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const size = new Box3().setFromObject(mature).getSize(new Vector3());
  return { object, factor: PLANT_SIZE / Math.max(size.x, size.y, size.z, MIN_EXTENT) };
}
