import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { GROWTH_MOTION, GROWTH_SEED } from "@/lib/scene/constants";
import type { GrowthTransition } from "@/lib/scene/GrowthTransition";

interface GrowthSeedProps {
  transition: GrowthTransition;
}

export function GrowthSeed({ transition }: GrowthSeedProps) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mesh.current || !material.current) return;
    const layer = transition.sample(clock.elapsedTime).find((item) => item.stage === 0);
    mesh.current.visible = !!layer && layer.opacity > GROWTH_MOTION.visibleOpacity;
    material.current.opacity = layer?.opacity ?? 0;
  });
  return (
    <mesh ref={mesh} position={[0, GROWTH_SEED.height, 0]} scale={GROWTH_SEED.squash}>
      <sphereGeometry
        args={[GROWTH_SEED.radius, GROWTH_SEED.widthSegments, GROWTH_SEED.heightSegments]}
      />
      <meshStandardMaterial ref={material} color={GROWTH_SEED.color} transparent />
    </mesh>
  );
}
