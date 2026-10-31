import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { CROPS, type CropId } from "@/lib/crops/catalog";

export type AssetReader = (filename: string) => Promise<ArrayBuffer>;

interface AssetEntry {
  promise: Promise<GLTF>;
  loaded: boolean;
}

/** Parse vault bytes directly: Obsidian resource URLs are not a portable fetch API. */
export class CropAssets {
  private entries = new Map<string, AssetEntry>();
  private loader = new GLTFLoader();

  constructor(private read: AssetReader) {}

  load(crop: CropId, stage: number): Promise<GLTF> {
    const filename = `${CROPS[crop].model}_${stage}.glb`;
    const cached = this.entries.get(filename);
    if (cached) return cached.promise;
    const promise = Promise.resolve()
      .then(() => this.read(filename))
      .then((bytes) => this.loader.parseAsync(bytes, ""))
      .then((gltf) => {
        entry.loaded = true;
        return gltf;
      });
    const entry: AssetEntry = { promise, loaded: false };
    this.entries.set(filename, entry);
    return entry.promise;
  }

  preload(crop: CropId): void {
    for (let stage = 1; stage <= 4; stage++) void this.load(crop, stage).catch(() => {});
  }

  retry(): void {
    for (const [key, entry] of this.entries) if (!entry.loaded) this.entries.delete(key);
  }
}
