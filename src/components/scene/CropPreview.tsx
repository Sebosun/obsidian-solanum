import { useEffect } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { GROWTH_MOTION } from "@/lib/scene/constants";
import { Plant } from "@/components/scene/Plant";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

interface CropPreviewProps {
  crop: CropId;
}

/**
 * What a crop will yield, shown while choosing what to plant: the produce where the crop has it,
 * the mature plant where it does not, standing where the growing crop will.
 */
export function CropPreview({ crop }: CropPreviewProps) {
  const assets = getCropAssets(useServices());
  useEffect(() => {
    assets.preload(crop);
  }, [crop, assets]);
  return (
    <group name="crop-preview" position={GROWTH_MOTION.basePosition}>
      <Plant crop={crop} stage={4} harvested />
    </group>
  );
}
