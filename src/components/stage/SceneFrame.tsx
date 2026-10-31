import { Suspense, useId, useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { SrLabel } from "@/components/app/SrLabel";
import { ProgressBar } from "@/components/clock/ProgressBar";
import { TimeHeader } from "@/components/clock/TimeHeader";
import { SceneBoundary } from "@/components/stage/SceneBoundary";
import { seasonStyle, type SeasonStyle } from "@/components/stage/seasonStyle";
import { TimerCamera } from "@/components/stage/TimerCamera";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSunClock, type SunClock } from "@/hooks/useSunClock";
import type { SceneBounds } from "@/lib/scene/framing";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { sunState, type SunState } from "@/lib/scene/sunClock";
import { formatTime } from "@/lib/time";

/** What a scene needs to know to draw itself inside the frame. */
export interface SceneFrameState {
  reduced: boolean;
  /** Whether the frame is scrolled into view. */
  visible: boolean;
  /** Visible and motion is welcome: the scene may keep moving. */
  animate: boolean;
  /** The sun for the progress last reported, for lights that are set once a second. */
  sun: SunState;
  /** The sun animated frame by frame, for lights and colours that should glide. */
  clock: SunClock;
}

/** What makes a scene's frame its own: its words, its fallback and where its camera looks. */
export interface SceneFrameLook {
  /** Further classes for the frame, such as `is-mature`. */
  classNames?: string[];
  /** A few words above the time, such as the name of the phase. */
  caption?: string;
  /** What the 3D view shows, the timer, and the progress bar, for assistive technology. */
  label: string;
  timerLabel: string;
  progressLabel: string;
  /** Shown instead of the 3D view when it cannot be drawn. */
  fallback: ReactNode;
  /** When this changes, a failed 3D view gets another chance. */
  resetKey?: unknown;
  /** What the camera keeps in view, when the scene is not the crop's plot. */
  camera?: { bounds?: SceneBounds; center?: number };
}

interface SceneFrameProps extends SceneFrameLook {
  remaining: number;
  /** How far through the running phase the clock is, from 0 to 1. */
  clockProgress: number;
  /** How fast the clock advances, per second: 0 while paused or waiting. */
  clockRate: number;
  season: SeasonId;
  immersive?: boolean;
  /** What to draw in the 3D view. */
  children(state: SceneFrameState): ReactNode;
}

/**
 * Everything the timer's scenes have in common, so each one is only what is in its picture: the
 * sky that darkens as the phase runs out, the time at the top, a thin progress bar along the
 * bottom, the transparent 3D view with its camera, labels for assistive technology, and a way to
 * fall back when 3D is unavailable.
 */
export function SceneFrame({
  remaining,
  clockProgress,
  clockRate,
  season,
  immersive = false,
  classNames = [],
  caption,
  label,
  timerLabel,
  progressLabel,
  fallback,
  resetKey,
  camera,
  children,
}: SceneFrameProps) {
  const container = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(container);
  const reduced = useReducedMotion();
  const clock = useSunClock(clockProgress, clockRate, reduced, visible);
  const labelId = useId();
  const timerLabelId = useId();
  const theme = SEASON_THEMES[season];
  const sun = sunState(clockProgress);
  const animate = visible && !reduced;
  const style: SeasonStyle & { "--dusk": number } = {
    ...seasonStyle(theme),
    "--dusk": sun.dusk,
  };
  const classes = ["solanum-scene", `is-${season}`, ...classNames];
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")} style={style}>
      <TimeHeader remaining={remaining} reduced={reduced} caption={caption} />
      <SceneBoundary resetKey={resetKey} fallback={fallback}>
        {/* Nothing is drawn while models load: the placeholder is only for when WebGL fails. */}
        <Suspense fallback={null}>
          <Canvas
            orthographic
            dpr={[1, 1.5]}
            frameloop={animate ? "always" : "demand"}
            fallback={fallback}
            role="img"
            aria-labelledby={labelId}
          >
            <TimerCamera bounds={camera?.bounds} center={camera?.center} />
            {children({ reduced, visible, animate, sun, clock })}
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <ProgressBar clock={clock} progress={clockProgress} label={progressLabel} />
      <SrLabel id={labelId}>{label}</SrLabel>
      <SrLabel id={timerLabelId}>{timerLabel}</SrLabel>
      <span role="timer" aria-labelledby={timerLabelId} className="sol:sr-only">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
