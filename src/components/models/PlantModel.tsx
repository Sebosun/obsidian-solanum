import { useEffect, useMemo } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { preparePlant } from "@/lib/crops/geometry";
import { useCropModel } from "@/hooks/useCropModel";
import { clonePlantMaterials } from "@/lib/crops/materials";

interface PlantModelProps {
  crop: CropId;
  stage: number;
  scale?: number;
}

export function PlantModel({ crop, stage, scale = 1 }: PlantModelProps) {
  const { scene } = useCropModel(crop, Math.max(1, stage));
  const { scene: mature } = useCropModel(crop, 4);
  const { object, factor, materials } = useMemo(() => {
    const prepared = preparePlant(scene, mature);
    return { ...prepared, materials: clonePlantMaterials(prepared.object, { animated: false }) };
  }, [scene, mature]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
