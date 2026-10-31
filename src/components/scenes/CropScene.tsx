import { Suspense } from "react";
import { cropStage } from "@/lib/crops/growth";
import type { CropId } from "@/lib/crops/catalog";
import type { SeasonId } from "@/lib/scene/seasons";
import { CropFallback } from "@/components/scenes/CropFallback";
import { CropPreview } from "@/components/models/CropPreview";
import { GrowingCrop } from "@/components/models/GrowingCrop";
import { CompletionFlourish } from "@/components/stage/CompletionFlourish";
import { CropSwap } from "@/components/stage/CropSwap";
import type { SceneFrameLook, SceneFrameState } from "@/components/stage/SceneFrame";
import { SeasonScenery } from "@/components/stage/SeasonScenery";
import { useReadyCrop } from "@/hooks/useReadyCrop";

interface CropSceneProps {
  crop: CropId;
  progress: number;
  running: boolean;
  season: SeasonId;
  /** Show what the crop will become instead of its growth: while choosing, before a session. */
  preview: boolean;
  frame: SceneFrameState;
}

/** What the focus's frame says: the crop's growth, and the plant itself once it has matured. */
export function cropFrame(crop: CropId, progress: number): SceneFrameLook {
  return {
    classNames: progress >= 1 ? ["is-mature"] : [],
    label: "Growing crop",
    timerLabel: "Remaining time",
    progressLabel: "Focus progress",
    fallback: <CropFallback crop={crop} progress={progress} />,
    resetKey: crop,
  };
}

/** The focus as drawn inside the frame: a crop growing on its plot, or what it will become. */
export function CropScene({ crop, progress, running, season, preview, frame }: CropSceneProps) {
  const shownCrop = useReadyCrop(crop);
  const stage = cropStage(progress);
  const { reduced, visible, animate, sun, clock } = frame;
  return (
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
  );
}
