import { useEffect, useMemo } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { prepareProduce } from "@/lib/crops/geometry";
import { useProduceModel } from "@/hooks/useProduceModel";
import { clonePlantMaterials } from "@/lib/crops/materials";

interface ProduceProps {
  crop: CropId;
  scale?: number;
}

/** What a harvested crop yields, standing on the ground. */
export function Produce({ crop, scale = 1 }: ProduceProps) {
  const { scene } = useProduceModel(crop);
  const { object, factor, materials } = useMemo(() => {
    const prepared = prepareProduce(scene);
    return { ...prepared, materials: clonePlantMaterials(prepared.object, { animated: false }) };
  }, [scene]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
