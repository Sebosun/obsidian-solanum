import type { SeasonTheme } from "@/lib/scene/seasons";

interface SeasonPlatformProps {
  theme: SeasonTheme;
}

/** Snow banks around the rim: x, z, radius in world units. */
const SNOW_MOUNDS: readonly (readonly [number, number, number])[] = [
  [0.62, 0.3, 0.16],
  [-0.58, 0.38, 0.14],
  [0.1, -0.72, 0.17],
  [-0.5, -0.45, 0.12],
  [0.7, -0.25, 0.1],
];
const MOUND_FLATTENING = 0.45;

export function SeasonPlatform({ theme }: SeasonPlatformProps) {
  const { rim, top } = theme.platform;
  return (
    <>
      <mesh name="platform-rim" position={[0, -0.68, 0]}>
        <cylinderGeometry args={[0.95, 0.8, 0.25, 8]} />
        <meshStandardMaterial color={rim} roughness={1} />
      </mesh>
      <mesh name="platform-top" position={[0, -0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 8]} />
        <meshStandardMaterial color={top} roughness={theme.snowCover ? 0.85 : 1} />
      </mesh>
      {theme.snowCover && (
        <group name="snow-cover">
          {SNOW_MOUNDS.map(([x, z, radius]) => (
            <mesh key={`${x}-${z}`} position={[x, -0.54, z]} scale={[1, MOUND_FLATTENING, 1]}>
              <sphereGeometry args={[radius, 12, 8]} />
              <meshStandardMaterial color={top} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
