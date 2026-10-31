import { Box3, Mesh, type BufferGeometry, type Object3D } from "three";
import { prepareBaked, type PreparedBaked } from "@/lib/models/baked";

/** Authored dimensions and planting plane of the bundled farm plot, in world units. */
export const FARM_PLATFORM = {
  model: "stage/Farm_platform.glb",
  width: 1.9,
  plantingSurfaceY: -0.54,
  /** Bottom of the authored turf collar; only earth below this plane may stretch. */
  soilShoulderY: -0.052,
} as const;

export interface PlatformOptions {
  width: number;
  /** Depth below the planting plane, used for session-length columns in the month. */
  soilHeight?: number;
}

export interface PreparedPlatform extends PreparedBaked {
  /** Only deformed geometry belongs to this instance; normal timer copies share the GLTF geometry. */
  geometries: BufferGeometry[];
}

export function prepareFarmPlatform(
  scene: Object3D,
  { width, soilHeight }: PlatformOptions,
): PreparedPlatform {
  const prepared = prepareBaked(scene, { size: { width }, grounded: false });
  const geometries: BufferGeometry[] = [];
  if (soilHeight === undefined) return { ...prepared, geometries };

  const originalFloor = new Box3().setFromObject(prepared.object).min.y;
  const shoulder = FARM_PLATFORM.soilShoulderY;
  const originalEarth = shoulder - originalFloor;
  const stretchedEarth = soilHeight / prepared.factor + shoulder;
  prepared.object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const geometry = node.geometry.clone();
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i += 1) {
      const height = positions.getY(i);
      if (height >= shoulder) continue;
      const belowShoulder = (shoulder - height) / originalEarth;
      positions.setY(i, shoulder - belowShoulder * stretchedEarth);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    node.geometry = geometry;
    geometries.push(geometry);
  });
  return { ...prepared, geometries };
}
