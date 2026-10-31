import type { HarvestBlock } from "@/lib/harvest/month";
import { cropStage } from "@/lib/crops/growth";
import { HARVEST_BLOCKS } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { seasonalColor } from "@/lib/scene/tint";
import { Plant } from "@/components/models/Plant";
import { RiseGroup } from "@/components/stage/RiseGroup";

interface HarvestBlockMeshProps {
  block: HarvestBlock;
  /** Position in the grid; later blocks start rising a beat after earlier ones. */
  index: number;
  season: SeasonId;
  reduced: boolean;
}

const SOIL = "#6b4a30";
const EDGE_INSET = 0.02;
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
export function HarvestBlockMesh({ block, index, season, reduced }: HarvestBlockMeshProps) {
  const theme = SEASON_THEMES[season];
  const [x, , z] = block.position;
  const { size, topThickness } = HARVEST_BLOCKS;
  return (
    <group name={`block-${block.sessionId}`} position={[x, 0, z]}>
      <RiseGroup index={Math.min(index, MAX_STAGGER_INDEX)} reduced={reduced}>
        <mesh name="block-body" position={[0, block.height / 2, 0]}>
          <boxGeometry args={[size, block.height, size]} />
          <meshStandardMaterial color={seasonalColor(SOIL, season)} roughness={1} />
        </mesh>
        <mesh name="block-top" position={[0, block.height + topThickness / 2, 0]}>
          <boxGeometry args={[size + EDGE_INSET, topThickness, size + EDGE_INSET]} />
          <meshStandardMaterial color={theme.platform.top} roughness={1} />
        </mesh>
        <group position={[0, block.height + topThickness, 0]}>
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
