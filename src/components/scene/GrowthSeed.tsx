import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
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
    mesh.current.visible = !!layer && layer.opacity > 0.001;
    material.current.opacity = layer?.opacity ?? 0;
  });
  return (
    <mesh ref={mesh} position={[0, 0.07, 0]} scale={[1, 0.55, 0.7]}>
      <sphereGeometry args={[0.09, 12, 8]} />
      <meshStandardMaterial ref={material} color="#e8bb77" transparent />
    </mesh>
  );
}
