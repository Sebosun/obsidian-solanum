import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { CropId } from "@/lib/crops/catalog";
import { useCropAssets } from "@/hooks/useCropAssets";

export function useCropModel(crop: CropId, stage: number): GLTF {
  return use(useCropAssets().load(crop, stage));
}
