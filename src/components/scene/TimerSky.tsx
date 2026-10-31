import { SeasonScenery } from "@/components/scene/SeasonScenery";
import { SunClock } from "@/components/scene/SunClock";
import { useSunProgress } from "@/hooks/useSunProgress";
import type { SeasonId } from "@/lib/scene/seasons";
import { sunState } from "@/lib/scene/sunClock";

interface TimerSkyProps {
  season: SeasonId;
  animate: boolean;
  reduced: boolean;
  /** How far through the running phase the clock is, 0 to 1. */
  progress: number;
  /** How fast progress advances, per second; 0 when paused or waiting. */
  rate: number;
  remaining: number;
  color: string;
}

/** The sun clock and the light that follows it, driven by one animated sun. */
export function TimerSky({
  season,
  animate,
  reduced,
  progress,
  rate,
  remaining,
  color,
}: TimerSkyProps) {
  const sun = useSunProgress(progress, rate, reduced);
  return (
    <>
      <SunClock
        sun={sun}
        progress={progress}
        remaining={remaining}
        color={color}
        reduced={reduced}
      />
      <SeasonScenery
        season={season}
        animate={animate}
        daylight={sunState(progress)}
        daylightRef={sun}
      />
    </>
  );
}
