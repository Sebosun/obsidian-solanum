import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { celebrationFrame } from "@/lib/scene/celebration";
import { HARVEST_FLOURISH } from "@/lib/scene/constants";
import { frameStep } from "@/lib/scene/motion";
import { useAppStore } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";

interface CompletionFlourishProps {
  reduced: boolean;
  children: ReactNode;
}

const { ring: RING } = HARVEST_FLOURISH;

/**
 * The one-shot burst when a live crop finishes: the crop lifts and swells while a ring spreads
 * from its base and fades. It plays once per new harvest and never for restored history, and the
 * ring is that burst, not a progress indicator, so it is drawn only for those moments.
 */
export function CompletionFlourish({ reduced, children }: CompletionFlourishProps) {
  const celebration = useAppStore((state) => state.celebration);
  const claim = useAppStore((state) => state.claimCelebration);
  const session = useAppStore(selectCurrentSession);
  const invalidate = useThree((state) => state.invalidate);
  const crop = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const playing = useRef(false);
  const elapsed = useRef(0);
  const id = celebration?.id;
  const celebratedSession = celebration?.sessionId;
  const currentSession = session?.sessionId;

  useEffect(() => {
    if (!id || !claim(id)) return;
    playing.current = !reduced && celebratedSession === currentSession;
    elapsed.current = 0;
    invalidate();
  }, [id, claim, reduced, invalidate, celebratedSession, currentSession]);

  useFrame((_state, delta) => {
    if (!crop.current || !ring.current || !material.current || !playing.current) return;
    elapsed.current += frameStep(delta);
    const frame = celebrationFrame(
      elapsed.current,
      reduced || celebratedSession !== currentSession,
    );
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
      <mesh ref={ring} position={[0, RING.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING.innerRadius, RING.outerRadius, RING.segments]} />
        <meshBasicMaterial
          ref={material}
          color={RING.color}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
