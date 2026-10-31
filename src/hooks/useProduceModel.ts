import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { CropId } from "@/lib/crops/catalog";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

export function useProduceModel(crop: CropId): GLTF {
  const services = useServices();
  return use(getCropAssets(services).loadProduce(crop));
}
