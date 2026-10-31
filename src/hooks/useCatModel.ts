import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { useBreakModel } from "@/hooks/useBreakModel";
import { BREAK_SCENE } from "@/lib/scene/constants";

export function useCatModel(): GLTF {
  return useBreakModel(BREAK_SCENE.catModel);
}
