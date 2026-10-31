import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { YearStack } from "@/lib/harvest/year";
import { YEAR_STACKS } from "@/lib/scene/constants";
import { cratePlantOffset, stackPosition } from "@/lib/scene/yearLayout";
import { Plant } from "@/components/scene/Plant";
import { RiseGroup } from "@/components/scene/RiseGroup";
import { CrateMesh } from "@/components/harvest/CrateMesh";

interface YearStackMeshProps {
  stack: YearStack;
  /** Short month name, e.g. "Mar". */
  label: string;
  hours: number | null;
  active: boolean;
  reduced: boolean;
  onActivate(index: number | null): void;
  onOpen(index: number): void;
}

const ACTIVE_LIFT = 0.1;
/** The label stands on the ground in the aisle in front of the stack, clear of the stacks behind. */
const LABEL_AISLE = 0.62;
const PLANT_SCALE = 0.34;
/** A crate sits slightly off its neighbour below, like crates stacked by hand. */
const WOBBLE = { x: 0.05, turn: 0.05 };
const FLOOR = 0.1;

/** A small, repeatable offset per crate, so stacks look hand-built but never change between renders. */
function wobble(index: number, level: number): { x: number; turn: number } {
  const seed = Math.sin((index + 1) * 12.9898 + (level + 1) * 78.233) * 43758.5453;
  const unit = seed - Math.floor(seed) - 0.5;
  return { x: unit * 2 * WOBBLE.x, turn: unit * 2 * WOBBLE.turn };
}

/** One month: crates stacked one per block of hours, the top one growing that month's crops. */
export function YearStackMesh({
  stack,
  label,
  hours,
  active,
  reduced,
  onActivate,
  onOpen,
}: YearStackMeshProps) {
  const [x, , z] = stackPosition(stack.index);
  const levels = stack.empty ? 1 : stack.crates;
  function enter(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onActivate(stack.index);
  }
  function leave(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onActivate(null);
  }
  function open(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onOpen(stack.index);
  }
  let className = "solanum-stack-label";
  if (stack.busiest) className += " is-busiest";
  if (active) className += " is-active";
  return (
    <group
      name={`stack-${stack.index}`}
      position={[x, active ? ACTIVE_LIFT : 0, z]}
      onPointerOver={enter}
      onPointerOut={leave}
      onClick={open}
    >
      <RiseGroup index={stack.index} reduced={reduced} uniform>
        {Array.from({ length: levels }, (_, level) => {
          const shift = wobble(stack.index, level);
          const crateHeight = stack.empty ? YEAR_STACKS.emptyCrateHeight : YEAR_STACKS.crateHeight;
          return (
            <group key={level} position={[shift.x, 0, 0]} rotation={[0, shift.turn, 0]}>
              <CrateMesh
                y={level * YEAR_STACKS.crateStep}
                height={crateHeight}
                highlighted={active}
              />
            </group>
          );
        })}
        {stack.plants.map((crop, slot) => {
          const [offsetX, offsetZ] = cratePlantOffset(slot, stack.plants.length);
          return (
            <group
              key={`${crop}-${slot}`}
              position={[offsetX, (stack.crates - 1) * YEAR_STACKS.crateStep + FLOOR, offsetZ]}
            >
              <Plant crop={crop} stage={4} scale={PLANT_SCALE} />
            </group>
          );
        })}
      </RiseGroup>
      <Html
        center
        position={[0, 0.05, YEAR_STACKS.crateDepth / 2 + LABEL_AISLE]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[5, 0]}
      >
        <span className={className}>
          {label}
          {hours !== null && <small>{hours} h</small>}
        </span>
      </Html>
    </group>
  );
}
