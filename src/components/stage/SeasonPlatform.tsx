import type { SeasonTheme } from "@/lib/scene/seasons";
import { Suspense, type MutableRefObject } from "react";
import { FarmPlatform } from "@/components/models/FarmPlatform";
import type { SunState } from "@/lib/scene/sunClock";
import { FARM_PLATFORM } from "@/lib/models/platform";

interface SeasonPlatformProps {
  theme: SeasonTheme;
  daylightRef?: MutableRefObject<SunState>;
}

/** Snow banks around the rim: x, z, radius in world units. */
const SNOW_MOUNDS: readonly (readonly [number, number, number])[] = [
  [0.62, 0.3, 0.16],
  [-0.58, 0.38, 0.14],
  [0.1, -0.59, 0.14],
  [-0.5, -0.45, 0.12],
  [0.7, -0.25, 0.1],
];
const MOUND_FLATTENING = 0.45;

export function SeasonPlatform({ theme, daylightRef }: SeasonPlatformProps) {
  const { top } = theme.platform;
  return (
    <>
      <Suspense fallback={null}>
        <FarmPlatform daylightRef={daylightRef} />
      </Suspense>
      {theme.snowCover && (
        <group name="snow-cover">
          {SNOW_MOUNDS.map(([x, z, radius]) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, FARM_PLATFORM.plantingSurfaceY, z]}
              scale={[1, MOUND_FLATTENING, 1]}
            >
              <sphereGeometry args={[radius, 12, 8]} />
              <meshStandardMaterial color={top} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
