import { useMemo } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { preparePlant } from "@/lib/crops/geometry";
import { useCropModel } from "@/hooks/useCropModel";

interface PlantModelProps {
  crop: CropId;
  stage: number;
  scale?: number;
}

export function PlantModel({ crop, stage, scale = 1 }: PlantModelProps) {
  const { scene } = useCropModel(crop, Math.max(1, stage));
  const { scene: mature } = useCropModel(crop, 4);
  const { object, factor } = useMemo(() => preparePlant(scene, mature), [scene, mature]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
