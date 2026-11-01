import type { ThreeEvent } from "@react-three/fiber";
import type { HarvestBlock } from "@/lib/harvest/month";
import { cropStage } from "@/lib/crops/growth";
import { HARVEST_BLOCKS } from "@/lib/scene/constants";
import { FarmPlatform } from "@/components/models/FarmPlatform";
import { Plant } from "@/components/models/Plant";
import { RiseGroup } from "@/components/models/RiseGroup";

interface HarvestBlockMeshProps {
  block: HarvestBlock;
  /** Position in the grid; later blocks start rising a beat after earlier ones. */
  index: number;
  reduced: boolean;
  onInspect?(sessionId: string | null): void;
}

/** Plant size grows from the smallest to the largest session, and a growing crop is smaller. */
const PLANT_MIN = 0.68;
const PLANT_RANGE = 0.26;
const GROWING_SHARE = 0.25;
/** Blocks past this many rise together, so a busy month does not take seconds to appear. */
const MAX_STAGGER_INDEX = 40;

export function plantSize(minutes: number, progress: number): number {
  const share =
    Math.min(minutes, HARVEST_BLOCKS.fullHeightMinutes) / HARVEST_BLOCKS.fullHeightMinutes;
  return (PLANT_MIN + PLANT_RANGE * share) * (1 - GROWING_SHARE + GROWING_SHARE * progress);
}

/** One harvest: a block as tall as the session was long, with the crop growing on top. */
export function HarvestBlockMesh({ block, index, reduced, onInspect }: HarvestBlockMeshProps) {
  const [x, , z] = block.position;
  const { size, topThickness } = HARVEST_BLOCKS;
  const plantingSurfaceY = block.height + topThickness;
  function inspect(event: ThreeEvent<PointerEvent | MouseEvent>) {
    event.stopPropagation();
    onInspect?.(block.sessionId);
  }
  return (
    <group
      name={`block-${block.sessionId}`}
      position={[x, 0, z]}
      onPointerOver={inspect}
      onClick={inspect}
    >
      <RiseGroup index={Math.min(index, MAX_STAGGER_INDEX)} reduced={reduced}>
        <FarmPlatform
          width={size}
          plantingSurfaceY={plantingSurfaceY}
          soilHeight={plantingSurfaceY}
        />
        <group position={[0, plantingSurfaceY, 0]}>
          <Plant
            crop={block.crop}
            stage={Math.max(1, cropStage(block.progress))}
            scale={plantSize(block.minutes, block.progress)}
            harvested={block.progress >= 1}
          />
        </group>
      </RiseGroup>
    </group>
  );
}
