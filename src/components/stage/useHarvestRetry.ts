import { useState } from "react";
import { useCropAssets } from "@/hooks/useCropAssets";

/**
 * A harvest scene's way back from a failed load: `retry` asks the shared repository to forget its
 * failures and bumps `attempt`, which the scene uses as a key to remount its boundary.
 */
export function useHarvestRetry() {
  const assets = useCropAssets();
  const [attempt, setAttempt] = useState(0);
  function retry() {
    assets.retry();
    setAttempt(attempt + 1);
  }
  return { attempt, retry };
}
