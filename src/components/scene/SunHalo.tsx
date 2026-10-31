interface SunHaloProps {
  color: string;
  position: [number, number, number];
}

const HALO_LAYERS = [
  { radius: 0.17, opacity: 0.95 },
  { radius: 0.36, opacity: 0.28 },
  { radius: 0.62, opacity: 0.11 },
] as const;

/** A soft, additive sun disc that always faces the camera. */
export function SunHalo({ color, position }: SunHaloProps) {
  return (
    <group name="season-halo" position={position}>
      {HALO_LAYERS.map((layer) => (
        <mesh key={layer.radius}>
          <circleGeometry args={[layer.radius, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
