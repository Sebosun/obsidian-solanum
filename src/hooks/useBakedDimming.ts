import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshBasicMaterial } from "three";
import type { SunState } from "@/lib/scene/sunClock";

/** Never darker than this share of a model's baked colours, so it stays readable at dusk. */
const DIMMEST = 0.5;

/**
 * Baked models carry their own light and ignore the scene's, so as the sun sets they are dimmed by
 * hand, following the same light as everything else.
 */
export function useBakedDimming(
  materials: MeshBasicMaterial[],
  daylightRef?: MutableRefObject<SunState>,
): void {
  useFrame(() => {
    const light = Math.min(1, daylightRef?.current.lightFactor ?? 1);
    for (const material of materials) material.color.setScalar(DIMMEST + (1 - DIMMEST) * light);
  });
}
