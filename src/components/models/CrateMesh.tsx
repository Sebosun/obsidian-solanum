import { useEffect, useMemo } from "react";
import { Box3 } from "three";
import { YEAR_STACKS } from "@/lib/scene/constants";
import { useModel } from "@/hooks/useModel";
import { prepareBaked } from "@/lib/models/baked";

interface CrateMeshProps {
  /** Height of the bottom of the crate above the ground. */
  y: number;
  height?: number;
  /** Lightens the wood, for the stack under the pointer. */
  highlighted: boolean;
}

const CRATE_MODEL = "harvest/Crate.glb";
const HIGHLIGHT_BRIGHTNESS = 1.16;

/** The Blender-authored open produce crate, shared geometry with instance-private baked wood. */
export function CrateMesh({ y, height = YEAR_STACKS.crateHeight, highlighted }: CrateMeshProps) {
  const { scene } = useModel(CRATE_MODEL);
  const crate = useMemo(() => {
    const prepared = prepareBaked(scene, {
      size: { width: YEAR_STACKS.crateWidth },
      centered: true,
    });
    const bounds = new Box3().setFromObject(prepared.object);
    return { ...prepared, nativeHeight: bounds.max.y - bounds.min.y };
  }, [scene]);
  useEffect(() => () => crate.materials.forEach((material) => material.dispose()), [crate]);
  useEffect(() => {
    for (const material of crate.materials)
      material.color.setScalar(highlighted ? HIGHLIGHT_BRIGHTNESS : 1);
  }, [crate, highlighted]);
  return (
    <group
      name="crate"
      position={[0, y, 0]}
      scale={[crate.factor, height / crate.nativeHeight, crate.factor]}
    >
      <primitive object={crate.object} dispose={null} />
    </group>
  );
}
