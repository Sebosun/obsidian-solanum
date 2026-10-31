import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type Material,
  type Object3D,
} from "three";

export interface BakedSize {
  /** Scale the model to this height... */
  height?: number;
  /** ...or to this width (along X). */
  width?: number;
}

export interface BakedOptions {
  size: BakedSize;
  /** Centre the model over the origin; otherwise it keeps its own axis (a mug with a handle). */
  centered?: boolean;
  /** Leave an authored planting surface at its own origin instead of grounding the underside. */
  grounded?: boolean;
}

export interface PreparedBaked {
  object: Object3D;
  /** The scale that sizes the model as asked. */
  factor: number;
  /** The model's own materials, private to this copy so its brightness can change. */
  materials: MeshBasicMaterial[];
}

/**
 * Gets a model whose lighting was baked into its colours or texture ready for the scene: sized as asked,
 * standing on the ground, with materials of its own. The colours are already final, so they must
 * not go through the renderer's tone mapping, which would shift and wash them out.
 */
export function prepareBaked(
  scene: Object3D,
  { size, centered = false, grounded = true }: BakedOptions,
): PreparedBaked {
  const object = scene.clone(true);
  const box = new Box3().setFromObject(object);
  const extent = box.getSize(new Vector3());
  object.position.set(
    centered ? -(box.min.x + box.max.x) / 2 : 0,
    grounded ? -box.min.y : 0,
    centered ? -(box.min.z + box.max.z) / 2 : 0,
  );
  const copies = new Map<Material, MeshBasicMaterial>();
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const original = node.material as Material;
    if (!(original instanceof MeshBasicMaterial)) return;
    let copy = copies.get(original);
    if (!copy) {
      copy = original.clone();
      copy.toneMapped = false;
      copies.set(original, copy);
    }
    node.material = copy;
  });
  const factor =
    size.width !== undefined
      ? size.width / Math.max(extent.x, 0.001)
      : (size.height ?? 1) / Math.max(extent.y, 0.001);
  return { object, factor, materials: [...copies.values()] };
}

/**
 * How high a model's floor is at its centre, in the model's own units: the first surface met
 * dropping straight down from above. For a bed with a dish, this is where something lies.
 */
export function floorAtCentre(object: Object3D): number {
  object.updateMatrixWorld(true);
  const top = new Box3().setFromObject(object).max.y + 1;
  const raycaster = new Raycaster(new Vector3(0, top, 0), new Vector3(0, -1, 0));
  const hit = raycaster.intersectObject(object, true)[0];
  return hit ? hit.point.y : 0;
}
