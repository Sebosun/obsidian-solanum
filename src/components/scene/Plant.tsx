import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { CROPS, type CropId } from "../../lib/crops/catalog";
import { preparePlant } from "../../lib/crops/geometry";

export function Plant({
  crop,
  stage,
  assetUrl,
  moving = false,
  scale = 1,
}: {
  crop: CropId;
  stage: number;
  assetUrl: (name: string) => string;
  moving?: boolean;
  scale?: number;
}) {
  const model = CROPS[crop].model;
  const { scene } = useGLTF(assetUrl(`${model}_${Math.max(1, stage)}.glb`));
  const { scene: mature } = useGLTF(assetUrl(`${model}_4.glb`));
  const { object, factor } = useMemo(() => preparePlant(scene, mature), [scene, mature]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 1.3) * 0.025 : 0;
  });
  return (
    <group ref={group} scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
