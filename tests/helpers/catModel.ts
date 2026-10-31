import { readFileSync } from "node:fs";
import { Texture, TextureLoader } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

// Node cannot decode images. A model's textures become empty ones: tests care that one is attached.
Object.assign(globalThis, { self: globalThis });
TextureLoader.prototype.load = function (_url, onLoad) {
  const texture = new Texture<HTMLImageElement>();
  onLoad?.(texture);
  return texture;
};

export const CAT_FILE = "assets/crops/Cat_sleeping.glb";
export const MUG_FILE = "assets/crops/mug.glb";

/** A shipped model, parsed the way the plugin parses it. */
export async function loadModel(path: string): Promise<GLTF> {
  const bytes = readFileSync(path);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}

export const loadCat = () => loadModel(CAT_FILE);
export const loadMug = () => loadModel(MUG_FILE);
