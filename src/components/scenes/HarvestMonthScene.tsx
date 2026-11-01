import { useId, useState, type KeyboardEvent } from "react";
import type { HarvestBlocks } from "@/lib/harvest/month";
import { isEmptyMonth } from "@/lib/harvest/empty";
import { HARVEST_BLOCKS, HARVEST_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SrLabel } from "@/components/app/SrLabel";
import { HarvestCanvas } from "@/components/stage/HarvestCanvas";
import { SceneBoundary } from "@/components/stage/SceneBoundary";
import { SeasonLights } from "@/components/stage/SeasonLights";
import { seasonStyle } from "@/components/stage/seasonStyle";
import { useHarvestRetry } from "@/components/stage/useHarvestRetry";
import { EmptyPlots } from "@/components/models/EmptyPlots";
import { HarvestBlockMesh } from "@/components/models/HarvestBlockMesh";
import { Plinth } from "@/components/models/Plinth";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";
import { HarvestDetail } from "@/components/harvest/HarvestDetail";
import { adjacentBed } from "@/lib/harvest/navigation";

interface HarvestMonthSceneProps {
  layout: HarvestBlocks;
  season: SeasonId;
}

/** How far the plinth reaches past the outermost blocks, in world units. */
const PLINTH_MARGIN = 0.5;
/** Tallest block plus the plants above it, so the camera always fits the full height. */
const SPACER_HEIGHT = 2.6;

export function HarvestMonthScene({ layout, season }: HarvestMonthSceneProps) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const groupId = useId();
  const detailId = useId();
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const inspected = layout.blocks.find((block) => block.sessionId === inspectedId);
  const { attempt, retry } = useHarvestRetry();
  const theme = SEASON_THEMES[season];
  const width = layout.columns * HARVEST_BLOCKS.pitch + PLINTH_MARGIN;
  const depth = layout.rows * HARVEST_BLOCKS.pitch + PLINTH_MARGIN;
  const style = { ...seasonStyle(theme), aspectRatio: HARVEST_SCENE.aspectRatio };
  const fallback = <HarvestUnavailable onRetry={retry} />;
  function clearInspection() {
    setInspectedId(null);
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      clearInspection();
      return;
    }
    if (layout.blocks.length === 0) return;
    const index = layout.blocks.findIndex((block) => block.sessionId === inspectedId);
    const next = adjacentBed(
      index < 0 ? null : index,
      event.key,
      layout.columns,
      layout.blocks.length,
    );
    if (next === null) return;
    event.preventDefault();
    setInspectedId(layout.blocks[next].sessionId);
  }

  return (
    <SceneBoundary key={attempt} fallback={fallback}>
      <div
        className={`solanum-harvest-scene solanum-month-scene is-${season}`}
        style={style}
        role="group"
        aria-labelledby={groupId}
        aria-describedby={inspected ? detailId : undefined}
        tabIndex={layout.blocks.length > 0 ? 0 : -1}
        onKeyDown={navigate}
        onBlur={clearInspection}
        onPointerDown={clearInspection}
        onPointerLeave={clearInspection}
      >
        <SrLabel id={groupId}>Harvest by session</SrLabel>
        <SrLabel id={labelId}>Blocks showing this month's harvests</SrLabel>
        <HarvestCanvas
          labelId={labelId}
          fallback={fallback}
          onRetry={retry}
          extent={{ width, depth, height: SPACER_HEIGHT }}
          lights={<SeasonLights theme={theme} />}
        >
          <Plinth name="month-plinth" width={width} depth={depth} />
          {isEmptyMonth(layout) && (
            <EmptyPlots columns={layout.columns} rows={layout.rows} season={season} />
          )}
          {layout.blocks.map((block, index) => (
            <HarvestBlockMesh
              key={block.key}
              block={block}
              index={index}
              reduced={reduced}
              onInspect={setInspectedId}
            />
          ))}
        </HarvestCanvas>
        {inspected && <HarvestDetail block={inspected} id={detailId} />}
      </div>
    </SceneBoundary>
  );
}
