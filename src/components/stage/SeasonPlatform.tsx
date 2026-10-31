import { Suspense, type MutableRefObject } from "react";
import type { SeasonTheme } from "@/lib/scene/seasons";
import type { SunState } from "@/lib/scene/sunClock";
import { FarmPlatform } from "@/components/models/FarmPlatform";
import { SnowMounds } from "@/components/models/SnowMounds";

interface SeasonPlatformProps {
  theme: SeasonTheme;
  daylightRef?: MutableRefObject<SunState>;
}

/** The plot the crop stands on, and the snow heaped on it when the season brings snow. */
export function SeasonPlatform({ theme, daylightRef }: SeasonPlatformProps) {
  return (
    <>
      <Suspense fallback={null}>
        <FarmPlatform daylightRef={daylightRef} />
      </Suspense>
      {theme.snowCover && <SnowMounds color={theme.platform.top} />}
    </>
  );
}
