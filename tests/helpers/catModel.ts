import { Texture, TextureLoader } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { loadAsset } from "./glb";

// Node cannot decode images. A model's textures become empty ones: tests care that one is attached.
Object.assign(globalThis, { self: globalThis });
TextureLoader.prototype.load = function (_url, onLoad) {
  const texture = new Texture<HTMLImageElement>();
  onLoad?.(texture);
  return texture;
};

export const CAT_FILE = "assets/break/Cat_sleeping.glb";
export const MUG_FILE = "assets/break/mug.glb";
export const PILLOW_FILE = "assets/break/pillow.glb";

/** A shipped model, parsed the way the plugin parses it. */
export function loadModel(path: string): Promise<GLTF> {
  return loadAsset(path.replace(/^assets\//, ""));
}

export const loadCat = () => loadModel(CAT_FILE);
export const loadMug = () => loadModel(MUG_FILE);
export const loadPillow = () => loadModel(PILLOW_FILE);
