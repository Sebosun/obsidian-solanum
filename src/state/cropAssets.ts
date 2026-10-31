import { CropAssets, type AssetReader } from "../lib/crops/CropAssets";
import type { SolanumHost } from "../types/host";

const repositories = new WeakMap<SolanumHost, CropAssets>();

export function getCropAssets(services: SolanumHost): CropAssets {
  const existing = repositories.get(services);
  if (existing) return existing;
  const read: AssetReader = async (filename) => {
    if (services.readAsset) return services.readAsset(filename);
    const response = await fetch(services.assetUrl(filename));
    if (!response.ok) throw new Error(`Cannot read crop: ${filename}`);
    return response.arrayBuffer();
  };
  const repository = new CropAssets(read);
  repositories.set(services, repository);
  return repository;
}
