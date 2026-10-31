import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { CropId } from "@/lib/crops/catalog";
import { useCropAssets } from "@/hooks/useCropAssets";

export function useProduceModel(crop: CropId): GLTF {
  return use(useCropAssets().loadProduce(crop));
}
