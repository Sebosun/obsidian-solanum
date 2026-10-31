import { useMemo } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { prepareProduce } from "@/lib/crops/geometry";
import { useProduceModel } from "@/hooks/useProduceModel";

interface ProduceProps {
  crop: CropId;
  scale?: number;
}

/** What a harvested crop yields, standing on the ground. */
export function Produce({ crop, scale = 1 }: ProduceProps) {
  const { scene } = useProduceModel(crop);
  const { object, factor } = useMemo(() => prepareProduce(scene), [scene]);
  return (
    <group scale={scale * factor}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
