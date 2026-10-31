import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

/** One of the break's models (the cat, the mug) by file name, loaded once and shared. */
export function useBreakModel(filename: string): GLTF {
  const services = useServices();
  return use(getCropAssets(services).loadModel(filename));
}
