import { use } from "react";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { useCropAssets } from "@/hooks/useCropAssets";

/** A bundled model by its path under assets/, loaded once through the shared vault reader. */
export function useModel(filename: string): GLTF {
  return use(useCropAssets().loadModel(filename));
}
