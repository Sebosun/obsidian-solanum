import { produceModel, type CropId } from "@/lib/crops/catalog";
import { PlantModel } from "@/components/models/PlantModel";
import { Produce } from "@/components/models/Produce";

interface PlantProps {
  crop: CropId;
  stage: number;
  scale?: number;
  /** Show what the crop yields instead of the plant, when it has such a model: the overview. */
  harvested?: boolean;
}

/** A crop at a growth stage, or, once harvested, its produce rather than the plant it grew on. */
export function Plant({ crop, stage, scale = 1, harvested = false }: PlantProps) {
  if (harvested && produceModel(crop) !== null) return <Produce crop={crop} scale={scale} />;
  return <PlantModel crop={crop} stage={stage} scale={scale} />;
}
