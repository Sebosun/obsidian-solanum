import { Suspense } from "react";
import { cropStage } from "@/lib/crops/growth";
import type { CropId } from "@/lib/crops/catalog";
import type { SeasonId } from "@/lib/scene/seasons";
import { CropFallback } from "@/components/scenes/CropFallback";
import { CropPreview } from "@/components/models/CropPreview";
import { GrowingCrop } from "@/components/models/GrowingCrop";
import { CompletionFlourish } from "@/components/stage/CompletionFlourish";
import { CropSwap } from "@/components/stage/CropSwap";
import { SceneFrame } from "@/components/stage/SceneFrame";
import { SeasonScenery } from "@/components/stage/SeasonScenery";
import { useReadyCrop } from "@/hooks/useReadyCrop";

interface CropSceneProps {
  crop?: CropId;
  progress: number;
  running: boolean;
  immersive?: boolean;
  remaining: number;
  /** How far through the running phase the clock is, from 0 to 1. */
  clockProgress: number;
  /** How fast the clock advances, per second: 0 while paused or waiting. */
  clockRate: number;
  season: SeasonId;
  /** Show what the crop will become instead of its growth: while choosing, before a session. */
  preview?: boolean;
}

/** The focus: a crop growing on its plot, or, before a session, what it will become. */
export function CropScene({
  crop = "tomato",
  progress,
  running,
  immersive = false,
  remaining,
  clockProgress,
  clockRate,
  season,
  preview = false,
}: CropSceneProps) {
  const shownCrop = useReadyCrop(crop);
  const stage = cropStage(progress);
  return (
    <SceneFrame
      remaining={remaining}
      clockProgress={clockProgress}
      clockRate={clockRate}
      season={season}
      immersive={immersive}
      classNames={progress >= 1 ? ["is-mature"] : []}
      label="Growing crop"
      timerLabel="Remaining time"
      progressLabel="Focus progress"
      fallback={<CropFallback crop={crop} progress={progress} />}
      resetKey={crop}
    >
      {({ reduced, visible, animate, sun, clock }) => (
        <>
          {/* Weather keeps drifting while the scene is on screen, even before a crop is planted. */}
          <SeasonScenery season={season} animate={animate} daylight={sun} daylightRef={clock.sun} />
          <CompletionFlourish reduced={reduced}>
            <CropSwap crop={shownCrop} reduced={reduced}>
              {(planted) => (
                <Suspense key={planted} fallback={null}>
                  {preview ? (
                    <CropPreview crop={planted} />
                  ) : (
                    <GrowingCrop
                      crop={planted}
                      stage={stage}
                      moving={running && visible && !reduced}
                      reduced={reduced}
                    />
                  )}
                </Suspense>
              )}
            </CropSwap>
          </CompletionFlourish>
        </>
      )}
    </SceneFrame>
  );
}
