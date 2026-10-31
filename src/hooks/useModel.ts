import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

/** A bundled model by its path under assets/, loaded once through the shared vault reader. */
export function useModel(filename: string): GLTF {
  const services = useServices();
  return use(getCropAssets(services).loadModel(filename));
}
