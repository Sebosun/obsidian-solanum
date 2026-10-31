import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import { HARVEST_SCENE } from "@/lib/scene/constants";
import { HarvestLoading } from "@/components/harvest/HarvestLoading";

/** The box the camera must fit, whatever is standing in it yet: its footprint and its height. */
export interface HarvestExtent {
  width: number;
  depth: number;
  height: number;
}

interface HarvestCanvasProps {
  /** The id of the text that names the 3D view for assistive technology. */
  labelId: string;
  /** Shown instead of the 3D view when it cannot be drawn. */
  fallback: ReactNode;
  onRetry(): void;
  extent: HarvestExtent;
  /** The scene's lights, outside the fitted box. */
  lights: ReactNode;
  /** What stands in the box. */
  children: ReactNode;
}

/**
 * What the month and the year share: a transparent isometric view that is drawn on demand, shows a
 * bounded loading state while models load, and fits the camera to the extent of the scene.
 */
export function HarvestCanvas({
  labelId,
  fallback,
  onRetry,
  extent,
  lights,
  children,
}: HarvestCanvasProps) {
  return (
    <Suspense fallback={<HarvestLoading onRetry={onRetry} />}>
      <Canvas
        orthographic
        camera={{ position: HARVEST_SCENE.cameraPosition, zoom: HARVEST_SCENE.initialZoom }}
        dpr={[1, 1.5]}
        frameloop="demand"
        fallback={fallback}
        role="img"
        aria-labelledby={labelId}
      >
        {lights}
        <Bounds fit clip observe margin={HARVEST_SCENE.fitMargin}>
          <group>
            {/* Invisible and never animated, so the camera fits the full height while things rise. */}
            <mesh visible={false} position={[0, extent.height / 2, 0]}>
              <boxGeometry args={[extent.width, extent.height, extent.depth]} />
            </mesh>
            {children}
          </group>
        </Bounds>
      </Canvas>
    </Suspense>
  );
}
