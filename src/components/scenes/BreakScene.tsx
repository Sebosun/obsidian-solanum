import { Suspense } from "react";
import { BreakFallback } from "@/components/scenes/BreakFallback";
import { CoffeeMug } from "@/components/models/CoffeeMug";
import { Pillow } from "@/components/models/Pillow";
import { SleepingCat } from "@/components/models/SleepingCat";
import { SceneFrame } from "@/components/stage/SceneFrame";
import { SeasonLights } from "@/components/stage/SeasonLights";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

interface BreakSceneProps {
  remaining: number;
  /** How far through the break the clock is, from 0 to 1. */
  clockProgress: number;
  /** How fast the clock advances, per second: 0 while paused. */
  clockRate: number;
  season: SeasonId;
  immersive?: boolean;
}

const CAMERA = { bounds: BREAK_SCENE.bounds, center: BREAK_SCENE.center };

/** The break: a cat asleep on a bed beside a steaming mug. */
export function BreakScene({
  remaining,
  clockProgress,
  clockRate,
  season,
  immersive = false,
}: BreakSceneProps) {
  const theme = SEASON_THEMES[season];
  return (
    <SceneFrame
      remaining={remaining}
      clockProgress={clockProgress}
      clockRate={clockRate}
      season={season}
      immersive={immersive}
      caption="Break time"
      label="A cat sleeping beside a cup of coffee"
      timerLabel="Break time remaining"
      progressLabel="Break progress"
      fallback={<BreakFallback />}
      camera={CAMERA}
    >
      {({ reduced, sun, clock }) => (
        <>
          <SeasonLights theme={theme} daylight={sun} daylightRef={clock.sun} showGlow={false} />
          <Suspense fallback={null}>
            <Pillow daylightRef={clock.sun}>
              <Suspense fallback={null}>
                <SleepingCat reduced={reduced} />
              </Suspense>
            </Pillow>
          </Suspense>
          <Suspense fallback={null}>
            <CoffeeMug reduced={reduced} daylightRef={clock.sun} />
          </Suspense>
        </>
      )}
    </SceneFrame>
  );
}
