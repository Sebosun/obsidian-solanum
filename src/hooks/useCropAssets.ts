import type { CropAssets } from "@/lib/crops/CropAssets";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

/** The plugin's shared model repository: the same one wherever it is asked for. */
export function useCropAssets(): CropAssets {
  return getCropAssets(useServices());
}
