import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CROPS, type CropId } from "../../lib/crops/catalog";
import { preparePlant } from "../../lib/crops/geometry";

interface PlantProps {
  crop: CropId;
  stage: number;
  assetUrl(name: string): string;
  scale?: number;
}

export function Plant({ crop, stage, assetUrl, scale = 1 }: PlantProps) {
  const model = CROPS[crop].model;
  const { scene } = useGLTF(assetUrl(`${model}_${Math.max(1, stage)}.glb`));
  const { scene: mature } = useGLTF(assetUrl(`${model}_4.glb`));
  const { object, factor } = useMemo(() => preparePlant(scene, mature), [scene, mature]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
