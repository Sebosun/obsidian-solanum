import type { ReactNode } from "react";
import { BREAK_FRAME, BreakScene } from "@/components/scenes/BreakScene";
import { CropScene, cropFrame } from "@/components/scenes/CropScene";
import { SceneFrame } from "@/components/stage/SceneFrame";
import type { TimerDisplay } from "@/lib/timer/display";
import type { SeasonId } from "@/lib/scene/seasons";

interface TimerSceneProps extends TimerDisplay {
  running: boolean;
  immersive: boolean;
  /** Buttons for the bottom left of the scene; none while choosing a crop. */
  controls?: ReactNode;
  season: SeasonId;
  /** Show what the crop will become instead of its growth: while choosing, before a session. */
  preview: boolean;
}

/**
 * The timer's picture: the crop while it grows, the sleeping cat once the break is under way. The
 * frame, and so the canvas in it, stays mounted across that change; only what is drawn inside swaps.
 */
export function TimerScene({
  crop,
  progress,
  running,
  resting,
  remaining,
  immersive,
  controls,
  preview,
  clockProgress,
  clockRate,
  season,
}: TimerSceneProps) {
  const look = resting ? BREAK_FRAME : cropFrame(crop, progress);
  return (
    <SceneFrame
      remaining={remaining}
      clockProgress={clockProgress}
      clockRate={clockRate}
      season={season}
      immersive={immersive}
      controls={controls}
      {...look}
    >
      {(frame) =>
        resting ? (
          <BreakScene season={season} frame={frame} />
        ) : (
          <CropScene
            crop={crop}
            progress={progress}
            running={running}
            season={season}
            preview={preview}
            frame={frame}
          />
        )
      }
    </SceneFrame>
  );
}
