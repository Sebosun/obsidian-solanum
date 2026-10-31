import { useEffect, useState } from "react";
import type { CropId } from "@/lib/crops/catalog";
import { useCropAssets } from "@/hooks/useCropAssets";

/**
 * The crop to show: the wanted one once all its models have loaded, and the previous one until
 * then. That way a crop is never shown half loaded, and the swap plays on a ready model. If loading
 * fails it still switches, so the scene's own error handling can say so.
 */
export function useReadyCrop(wanted: CropId): CropId {
  const assets = useCropAssets();
  const [shown, setShown] = useState(wanted);
  useEffect(() => {
    let current = true;
    const show = () => {
      if (current) setShown(wanted);
    };
    assets.ready(wanted).then(show, show);
    return () => {
      current = false;
    };
  }, [wanted, assets]);
  return shown;
}
