import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import type { MutableRefObject } from "react";
import { SeasonLights, type Daylight } from "@/components/scene/SeasonLights";
import type { SunState } from "@/lib/scene/sunClock";
import { SeasonParticles } from "@/components/scene/SeasonParticles";
import { SeasonPlatform } from "@/components/scene/SeasonPlatform";

interface SeasonSceneryProps {
  season: SeasonId;
  animate: boolean;
  /** When given, the light follows the sun clock and the theme's own fixed sun halo is left out. */
  daylight?: Daylight;
  /** The sun animated per frame, so the light eases instead of stepping with the clock. */
  daylightRef?: MutableRefObject<SunState>;
}

/** Lighting, ground and weather for the crop scene in one season. */
export function SeasonScenery({ season, animate, daylight, daylightRef }: SeasonSceneryProps) {
  const theme = SEASON_THEMES[season];
  return (
    <>
      <SeasonLights
        theme={theme}
        daylight={daylight}
        daylightRef={daylightRef}
        showGlow={!daylight}
      />
      <SeasonPlatform theme={theme} />
      <SeasonParticles theme={theme} animate={animate} />
    </>
  );
}
