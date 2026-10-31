import { Suspense } from "react";
import { BreakFallback } from "@/components/scenes/BreakFallback";
import { CoffeeMug } from "@/components/models/CoffeeMug";
import { Pillow } from "@/components/models/Pillow";
import { SleepingCat } from "@/components/models/SleepingCat";
import type { SceneFrameLook, SceneFrameState } from "@/components/stage/SceneFrame";
import { SeasonLights } from "@/components/stage/SeasonLights";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

interface BreakSceneProps {
  season: SeasonId;
  frame: SceneFrameState;
}

/** What the break's frame says and where its camera looks. */
export const BREAK_FRAME: SceneFrameLook = {
  caption: "Break time",
  label: "A cat sleeping beside a cup of coffee",
  timerLabel: "Break time remaining",
  progressLabel: "Break progress",
  fallback: <BreakFallback />,
  camera: { bounds: BREAK_SCENE.bounds, center: BREAK_SCENE.center },
};

/** The break as drawn inside the frame: a cat asleep on a bed beside a steaming mug. */
export function BreakScene({ season, frame }: BreakSceneProps) {
  const theme = SEASON_THEMES[season];
  const { reduced, sun, clock } = frame;
  return (
    <>
      <SeasonLights theme={theme} daylight={sun} daylightRef={clock.sun} />
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
  );
}
