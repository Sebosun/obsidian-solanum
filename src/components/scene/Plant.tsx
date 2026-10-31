import { useMemo } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { preparePlant } from "@/lib/crops/geometry";
import { useCropModel } from "@/hooks/useCropModel";

interface PlantProps {
  crop: CropId;
  stage: number;
  scale?: number;
}

export function Plant({ crop, stage, scale = 1 }: PlantProps) {
  const { scene } = useCropModel(crop, Math.max(1, stage));
  const { scene: mature } = useCropModel(crop, 4);
  const { object, factor } = useMemo(() => preparePlant(scene, mature), [scene, mature]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
