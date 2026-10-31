import { Suspense, useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import { adjacentBed } from "@/lib/harvest/navigation";
import type { YearMonth, YearStacks } from "@/lib/harvest/year";
import { HARVEST_SCENE, YEAR_STACKS } from "@/lib/scene/constants";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";
import { SrLabel } from "@/components/app/SrLabel";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { HarvestLoading } from "@/components/harvest/HarvestLoading";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";
import { HarvestYearFallback } from "@/components/harvest/HarvestYearFallback";
import { YearStackMesh } from "@/components/harvest/YearStackMesh";

interface HarvestYearSceneProps {
  year: number;
  months: YearMonth[];
  layout: YearStacks;
  onOpenMonth(index: number): void;
}

const LIGHT = { ambient: "#fff4de", ambientIntensity: 2, sun: "#fff0d2", sunIntensity: 2.8 };
const PLINTH = "#4a3f33";
const PLINTH_MARGIN = 0.9;
const PLINTH_HEIGHT = 0.2;
const MONTHS = 12;
/** Tallest stack plus the crops and label above it, so the camera always fits the full height. */
const SPACER_HEIGHT = YEAR_STACKS.maxCrates * YEAR_STACKS.crateStep + 0.9;

export function HarvestYearScene({ year, months, layout, onOpenMonth }: HarvestYearSceneProps) {
  const services = useServices();
  const reduced = useReducedMotion();
  const groupId = useId();
  const canvasId = useId();
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const width = YEAR_STACKS.columns * YEAR_STACKS.pitchX + PLINTH_MARGIN;
  const depth = (MONTHS / YEAR_STACKS.columns) * YEAR_STACKS.pitchZ + PLINTH_MARGIN;

  function retry() {
    getCropAssets(services).retry();
    setAttempt(attempt + 1);
  }
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
    const target = adjacentBed(active, event.key, YEAR_STACKS.columns, MONTHS);
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
        <Suspense fallback={<HarvestLoading onRetry={retry} />}>
          <Canvas
            orthographic
            camera={{ position: HARVEST_SCENE.cameraPosition, zoom: HARVEST_SCENE.initialZoom }}
            dpr={[1, 1.5]}
            frameloop="demand"
            fallback={fallback}
            role="img"
            aria-labelledby={canvasId}
          >
            <ambientLight color={LIGHT.ambient} intensity={LIGHT.ambientIntensity} />
            <directionalLight
              position={[3, 9, 6]}
              color={LIGHT.sun}
              intensity={LIGHT.sunIntensity}
            />
            <Bounds fit clip observe margin={HARVEST_SCENE.fitMargin}>
              <group>
                {/* Invisible and never animated, so the camera fits the full height while stacks rise. */}
                <mesh visible={false} position={[0, SPACER_HEIGHT / 2, 0]}>
                  <boxGeometry args={[width, SPACER_HEIGHT, depth]} />
                </mesh>
                <mesh name="year-plinth" position={[0, -PLINTH_HEIGHT / 2, 0]}>
                  <boxGeometry args={[width, PLINTH_HEIGHT, depth]} />
                  <meshStandardMaterial color={PLINTH} roughness={1} />
                </mesh>
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
              </group>
            </Bounds>
          </Canvas>
        </Suspense>
      </div>
    </SceneBoundary>
  );
}
