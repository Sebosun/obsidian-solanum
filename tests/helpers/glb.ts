import { readFileSync } from "node:fs";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

/** The bytes of a shipped file, by its path under `assets/`, exactly as the vault adapter returns them. */
export function readAsset(filename: string): ArrayBuffer {
  const bytes = readFileSync(`assets/${filename}`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** An `AssetReader` backed by the shipped files, for `CropAssets`. */
export const assetReader = async (filename: string) => readAsset(filename);

/** A shipped model, by its path under `assets/`, parsed the way the plugin parses it. */
export function loadAsset(filename: string): Promise<GLTF> {
  return new GLTFLoader().parseAsync(readAsset(filename), "");
}
