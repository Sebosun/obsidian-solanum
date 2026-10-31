import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { SeasonLights } from "@/components/scene/SeasonLights";
import { SeasonParticles } from "@/components/scene/SeasonParticles";
import { SeasonPlatform } from "@/components/scene/SeasonPlatform";

interface SeasonSceneryProps {
  season: SeasonId;
  animate: boolean;
}

/** Lighting, ground and weather for the crop scene in one season. */
export function SeasonScenery({ season, animate }: SeasonSceneryProps) {
  const theme = SEASON_THEMES[season];
  return (
    <>
      <SeasonLights theme={theme} />
      <SeasonPlatform theme={theme} />
      <SeasonParticles theme={theme} animate={animate} />
    </>
  );
}
