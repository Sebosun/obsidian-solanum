import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { celebrationFrame } from "../../lib/scene/celebration";
import { useAppStore } from "../../state/hooks";

interface CompletionFlourishProps {
  reduced: boolean;
  children: ReactNode;
}

export function CompletionFlourish({ reduced, children }: CompletionFlourishProps) {
  const celebration = useAppStore((state) => state.celebration);
  const claim = useAppStore((state) => state.claimCelebration);
  const invalidate = useThree((state) => state.invalidate);
  const crop = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const playing = useRef(false);
  const elapsed = useRef(0);
  const id = celebration?.id;

  useEffect(() => {
    if (!id || !claim(id)) return;
    playing.current = !reduced;
    elapsed.current = 0;
    invalidate();
  }, [id, claim, reduced, invalidate]);

  useFrame((_state, delta) => {
    if (!crop.current || !ring.current || !material.current || !playing.current) return;
    elapsed.current += Math.min(delta, 0.05);
    const frame = celebrationFrame(elapsed.current, reduced);
    crop.current.position.y = frame.lift;
    crop.current.scale.setScalar(frame.scale);
    ring.current.scale.setScalar(frame.ringScale);
    material.current.opacity = frame.ringOpacity;
    playing.current = !frame.done;
    invalidate();
  });
  return (
    <>
      <group ref={crop}>{children}</group>
      <mesh ref={ring} position={[0, -0.525, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 0.837, 48]} />
        <meshBasicMaterial
          ref={material}
          color="#a1bb79"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
