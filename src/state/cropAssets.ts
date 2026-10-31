import { CropAssets } from "@/lib/crops/CropAssets";
import type { SolanumHost } from "@/types/host";

const repositories = new WeakMap<SolanumHost, CropAssets>();

/** One model cache per host, reading GLBs through the host's vault binary adapter. */
export function getCropAssets(services: SolanumHost): CropAssets {
  const existing = repositories.get(services);
  if (existing) return existing;
  const repository = new CropAssets((filename) => services.readAsset(filename));
  repositories.set(services, repository);
  return repository;
}
