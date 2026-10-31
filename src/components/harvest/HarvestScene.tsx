import { Suspense, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import type { HarvestDay } from "@/lib/harvest/model";
import { adjacentDayKey } from "@/lib/harvest/navigation";
import { harvestAspectRatio, weekdayHeaderOffset } from "@/lib/scene/harvestFraming";
import { useServices } from "@/state/hooks";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { HarvestDayPlot } from "@/components/harvest/HarvestDayPlot";
import { HarvestDayList } from "@/components/harvest/HarvestDayList";
import { HarvestLoading } from "@/components/harvest/HarvestLoading";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";
import { HarvestWeekdays } from "@/components/harvest/HarvestWeekdays";
import { getCropAssets } from "@/state/cropAssets";
import { HARVEST_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
}

interface HarvestSceneProps {
  days: HarvestDay[];
  selectedKey: string | null;
  hoverKey: string | null;
  season: SeasonId;
  onHover(key: string | null): void;
  onSelect(key: string): void;
  onClear(): void;
}

export function HarvestScene({
  days,
  selectedKey,
  hoverKey,
  season,
  onHover,
  onSelect,
  onClear,
}: HarvestSceneProps) {
  const services = useServices();
  const [attempt, setAttempt] = useState(0);
  const rows = days[days.length - 1].row + 1;
  const theme = SEASON_THEMES[season];

  function retry() {
    getCropAssets(services).retry();
    setAttempt(attempt + 1);
  }
  function clearHover() {
    onHover(null);
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClear();
      return;
    }
    const target = adjacentDayKey(days, selectedKey, event.key);
    if (target === null) return;
    event.preventDefault();
    onSelect(target);
  }

  const fallback = (
    <div className="solanum-harvest-fallback">
      <HarvestUnavailable onRetry={retry} />
      <HarvestDayList days={days} selectedKey={selectedKey} onSelect={onSelect} />
    </div>
  );
  const sceneStyle: SeasonStyle = {
    aspectRatio: harvestAspectRatio(rows),
    "--season-glow": theme.css.glow,
    "--season-sun": theme.css.sun,
  };
  let className = `solanum-harvest-scene is-${season}`;
  if (hoverKey) className += " is-hovering";

  return (
    <SceneBoundary key={attempt} fallback={fallback}>
      <div
        className={className}
        role="group"
        aria-label="Monthly harvest calendar"
        tabIndex={0}
        style={sceneStyle}
        onKeyDown={navigate}
      >
        <Suspense fallback={<HarvestLoading onRetry={retry} />}>
          <Canvas
            orthographic
            camera={{ position: HARVEST_SCENE.cameraPosition, zoom: HARVEST_SCENE.initialZoom }}
            dpr={[1, 1.5]}
            frameloop="demand"
            fallback={fallback}
            onPointerMissed={clearHover}
            aria-label="3D monthly harvest calendar"
          >
            <ambientLight color={theme.ambient.color} intensity={theme.ambient.intensity} />
            <directionalLight
              position={[2, 8, 4]}
              intensity={theme.sun.intensity}
              color={theme.sun.color}
            />
            <Bounds fit clip observe margin={HARVEST_SCENE.fitMargin}>
              <group>
                <HarvestWeekdays z={weekdayHeaderOffset(rows)} />
                {days.map((day) => (
                  <HarvestDayPlot
                    key={day.key}
                    day={day}
                    hovered={day.key === hoverKey}
                    selected={day.key === selectedKey}
                    season={season}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                ))}
              </group>
            </Bounds>
          </Canvas>
        </Suspense>
      </div>
    </SceneBoundary>
  );
}
