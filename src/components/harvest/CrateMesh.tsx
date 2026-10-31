import { YEAR_STACKS } from "@/lib/scene/constants";

interface CrateMeshProps {
  /** Height of the bottom of the crate above the ground. */
  y: number;
  height?: number;
  /** Lightens the wood, for the stack under the pointer. */
  highlighted: boolean;
}

const WOOD = "#a57a4a";
const WOOD_DARK = "#72543a";
const WOOD_LIGHT = "#c79a63";
const PLANK = 0.08;
/** Where the two slats cross the front, as a share of the crate's height. */
const SLATS = [0.3, 0.62] as const;

/** An open wooden crate: a floor, four boards and two slats across the front. */
export function CrateMesh({ y, height = YEAR_STACKS.crateHeight, highlighted }: CrateMeshProps) {
  const { crateWidth: width, crateDepth: depth } = YEAR_STACKS;
  const wood = highlighted ? WOOD_LIGHT : WOOD;
  return (
    <group name="crate" position={[0, y, 0]}>
      <mesh position={[0, PLANK / 2, 0]}>
        <boxGeometry args={[width, PLANK, depth]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`z${side}`} position={[0, height / 2, (side * (depth - PLANK)) / 2]}>
          <boxGeometry args={[width, height, PLANK]} />
          <meshStandardMaterial color={wood} roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`x${side}`} position={[(side * (width - PLANK)) / 2, height / 2, 0]}>
          <boxGeometry args={[PLANK, height, depth]} />
          <meshStandardMaterial color={wood} roughness={1} />
        </mesh>
      ))}
      {SLATS.map((share) => (
        <mesh key={share} position={[0, height * share, depth / 2]}>
          <boxGeometry args={[width + 0.02, 0.03, PLANK + 0.02]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
