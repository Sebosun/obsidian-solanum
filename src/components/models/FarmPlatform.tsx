import { useEffect, useMemo, type MutableRefObject } from "react";
import { useModel } from "@/hooks/useModel";
import { useBakedDimming } from "@/hooks/useBakedDimming";
import { FARM_PLATFORM, prepareFarmPlatform } from "@/lib/models/platform";
import type { SunState } from "@/lib/scene/sunClock";

interface FarmPlatformProps {
  daylightRef?: MutableRefObject<SunState>;
  width?: number;
  plantingSurfaceY?: number;
  soilHeight?: number;
}

/** The authored soil plot keeps its planting surface, not its underside, at the crop's roots. */
export function FarmPlatform({
  daylightRef,
  width = FARM_PLATFORM.width,
  plantingSurfaceY = FARM_PLATFORM.plantingSurfaceY,
  soilHeight,
}: FarmPlatformProps) {
  const { scene } = useModel(FARM_PLATFORM.model);
  const platform = useMemo(
    () => prepareFarmPlatform(scene, { width, soilHeight }),
    [scene, width, soilHeight],
  );
  useEffect(
    () => () => {
      platform.materials.forEach((material) => material.dispose());
      platform.geometries.forEach((geometry) => geometry.dispose());
    },
    [platform],
  );
  useBakedDimming(platform.materials, daylightRef);
  return (
    <group name="farm-platform" position={[0, plantingSurfaceY, 0]} scale={platform.factor}>
      <primitive object={platform.object} dispose={null} />
    </group>
  );
}
