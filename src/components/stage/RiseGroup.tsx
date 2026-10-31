import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { plotEntrance } from "@/lib/scene/motion";

interface RiseGroupProps {
  /** Position in the sequence; later groups start a beat after earlier ones. */
  index: number;
  reduced: boolean;
  /** Grow in every direction (a whole bed) instead of only upwards (a row of plants). */
  uniform?: boolean;
  children: ReactNode;
}

const MAX_STEP_SECONDS = 0.05;
const MIN_SCALE = 0.0001;

/** Eases its children into place when it first appears; skipped under reduced motion. */
export function RiseGroup({ index, reduced, uniform = false, children }: RiseGroupProps) {
  const group = useRef<Group>(null);
  const age = useRef(0);
  const settled = useRef(reduced);
  const invalidate = useThree((state) => state.invalidate);
  useFrame((_state, delta) => {
    if (settled.current || !group.current) return;
    age.current += Math.min(delta, MAX_STEP_SECONDS);
    const frame = plotEntrance(age.current, index, reduced);
    const scale = Math.max(MIN_SCALE, frame.scale);
    if (uniform) group.current.scale.setScalar(scale);
    else group.current.scale.set(1, scale, 1);
    settled.current = frame.done;
    invalidate();
  });
  const start = reduced ? 1 : MIN_SCALE;
  return (
    <group ref={group} scale={uniform ? [start, start, start] : [1, start, 1]}>
      {children}
    </group>
  );
}
