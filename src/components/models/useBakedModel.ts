import { useEffect, type MutableRefObject } from "react";
import type { BufferGeometry } from "three";
import { useBakedDimming } from "@/hooks/useBakedDimming";
import type { PreparedBaked } from "@/lib/models/baked";
import type { SunState } from "@/lib/scene/sunClock";

/** A prepared baked model, which may also own geometry it reshaped for itself. */
type OwnedBaked = PreparedBaked & { geometries?: BufferGeometry[] };

/**
 * What every baked model does with the copy `prepareBaked` made for it: dims it as the sun sets,
 * and disposes what it owns (its own materials, and any geometry it deformed) when it goes. The
 * shared GLTF data it was cloned from is never touched.
 */
export function useBakedModel(model: OwnedBaked, daylightRef?: MutableRefObject<SunState>): void {
  useEffect(
    () => () => {
      model.materials.forEach((material) => material.dispose());
      model.geometries?.forEach((geometry) => geometry.dispose());
    },
    [model],
  );
  useBakedDimming(model.materials, daylightRef);
}
