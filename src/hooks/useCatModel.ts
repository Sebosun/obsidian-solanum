import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { useModel } from "@/hooks/useModel";
import { BREAK_SCENE } from "@/lib/scene/constants";

export function useCatModel(): GLTF {
  return useModel(BREAK_SCENE.catModel);
}
