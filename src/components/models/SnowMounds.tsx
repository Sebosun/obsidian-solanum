import { SNOW, SNOW_MOUNDS } from "@/lib/models/snow";

interface SnowMoundsProps {
  color: string;
}

/** Banks of snow round the rim of the plot: flattened spheres lying on its surface. */
export function SnowMounds({ color }: SnowMoundsProps) {
  return (
    <group name="snow-cover">
      {SNOW_MOUNDS.map(({ x, z, radius }) => (
        <mesh key={`${x}-${z}`} position={[x, SNOW.y, z]} scale={[1, SNOW.flattening, 1]}>
          <sphereGeometry args={[radius, SNOW.widthSegments, SNOW.heightSegments]} />
          <meshStandardMaterial color={color} roughness={SNOW.roughness} />
        </mesh>
      ))}
    </group>
  );
}
