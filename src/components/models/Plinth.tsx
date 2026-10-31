import { PLINTH } from "@/lib/models/plinth";

interface PlinthProps {
  name: string;
  width: number;
  depth: number;
}

/** The dark slab a harvest view stands on, its top at the ground and its body beneath it. */
export function Plinth({ name, width, depth }: PlinthProps) {
  return (
    <mesh name={name} position={[0, -PLINTH.height / 2, 0]}>
      <boxGeometry args={[width, PLINTH.height, depth]} />
      <meshStandardMaterial color={PLINTH.color} roughness={1} />
    </mesh>
  );
}
