import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { SeasonLights, type Daylight } from "@/components/scene/SeasonLights";
import { SeasonParticles } from "@/components/scene/SeasonParticles";
import { SeasonPlatform } from "@/components/scene/SeasonPlatform";

interface SeasonSceneryProps {
  season: SeasonId;
  animate: boolean;
  /** When given, the light follows the sun clock and the theme's own fixed sun halo is left out. */
  daylight?: Daylight;
}

/** Lighting, ground and weather for the crop scene in one season. */
export function SeasonScenery({ season, animate, daylight }: SeasonSceneryProps) {
  const theme = SEASON_THEMES[season];
  return (
    <>
      <SeasonLights theme={theme} daylight={daylight} showGlow={!daylight} />
      <SeasonPlatform theme={theme} />
      <SeasonParticles theme={theme} animate={animate} />
    </>
  );
}
