import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { adjacentBed } from "@/lib/harvest/navigation";
import type { YearMonth, YearStacks } from "@/lib/harvest/year";
import { MONTHS_PER_YEAR, YEAR_STACKS } from "@/lib/scene/constants";
import { YEAR_ROWS } from "@/lib/scene/yearLayout";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SrLabel } from "@/components/app/SrLabel";
import { HarvestCanvas } from "@/components/stage/HarvestCanvas";
import { SceneBoundary } from "@/components/stage/SceneBoundary";
import { useHarvestRetry } from "@/components/stage/useHarvestRetry";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";
import { HarvestYearFallback } from "@/components/harvest/HarvestYearFallback";
import { Plinth } from "@/components/models/Plinth";
import { YearStackMesh } from "@/components/models/YearStackMesh";

interface HarvestYearSceneProps {
  year: number;
  months: YearMonth[];
  layout: YearStacks;
  onOpenMonth(index: number): void;
}

const LIGHT = { ambient: "#fff4de", ambientIntensity: 2, sun: "#fff0d2", sunIntensity: 2.8 };
/** Where the year's sun shines from, in world units. */
const SUN_POSITION: [number, number, number] = [3, 9, 6];
/** How far the plinth reaches past the outermost stacks, in world units. */
const PLINTH_MARGIN = 0.9;
/** Room above the tallest stack for its crops and label, in world units. */
const HEADROOM = 0.9;
/** Tallest stack plus the crops and label above it, so the camera always fits the full height. */
const SPACER_HEIGHT = YEAR_STACKS.maxCrates * YEAR_STACKS.crateStep + HEADROOM;

export function HarvestYearScene({ year, months, layout, onOpenMonth }: HarvestYearSceneProps) {
  const reduced = useReducedMotion();
  const groupId = useId();
  const canvasId = useId();
  const { attempt, retry } = useHarvestRetry();
  const [active, setActive] = useState<number | null>(null);
  const width = YEAR_STACKS.columns * YEAR_STACKS.pitchX + PLINTH_MARGIN;
  const depth = YEAR_ROWS * YEAR_STACKS.pitchZ + PLINTH_MARGIN;

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && active !== null) {
      event.preventDefault();
      onOpenMonth(active);
      return;
    }
    const target = adjacentBed(active, event.key, YEAR_STACKS.columns, MONTHS_PER_YEAR);
    if (target === null) return;
    event.preventDefault();
    setActive(target);
  }
  const fallback = (
    <div className="solanum-harvest-fallback">
      <HarvestUnavailable onRetry={retry} />
      <HarvestYearFallback year={year} months={months} onOpenMonth={onOpenMonth} />
    </div>
  );
  const style: CSSProperties = { aspectRatio: YEAR_STACKS.sceneAspect };
  const lights = (
    <>
      <ambientLight color={LIGHT.ambient} intensity={LIGHT.ambientIntensity} />
      <directionalLight position={SUN_POSITION} color={LIGHT.sun} intensity={LIGHT.sunIntensity} />
    </>
  );

  return (
    <SceneBoundary key={attempt} fallback={fallback}>
      <div
        className="solanum-harvest-scene solanum-year-scene"
        role="group"
        aria-labelledby={groupId}
        tabIndex={0}
        style={style}
        onKeyDown={navigate}
      >
        <SrLabel id={groupId}>Harvest by month</SrLabel>
        <SrLabel id={canvasId}>A stack of crates for each month of the year</SrLabel>
        <HarvestCanvas
          labelId={canvasId}
          fallback={fallback}
          onRetry={retry}
          extent={{ width, depth, height: SPACER_HEIGHT }}
          lights={lights}
        >
          <Plinth name="year-plinth" width={width} depth={depth} />
          {layout.stacks.map((stack) => {
            const month = months[stack.index];
            return (
              <YearStackMesh
                key={stack.index}
                stack={stack}
                label={month.date.toLocaleDateString(undefined, { month: "short" })}
                hours={month.minutes > 0 ? Math.round(month.minutes / 60) : null}
                active={active === stack.index}
                reduced={reduced}
                onActivate={setActive}
                onOpen={onOpenMonth}
              />
            );
          })}
        </HarvestCanvas>
      </div>
    </SceneBoundary>
  );
}
