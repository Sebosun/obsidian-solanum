import { Suspense, useId, useRef, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { SrLabel } from "@/components/app/SrLabel";
import { BreakFallback } from "@/components/scenes/BreakFallback";
import { ProgressBar } from "@/components/clock/ProgressBar";
import { TimeHeader } from "@/components/clock/TimeHeader";
import { CoffeeMug } from "@/components/models/CoffeeMug";
import { Pillow } from "@/components/models/Pillow";
import { SceneBoundary } from "@/components/stage/SceneBoundary";
import { SeasonLights } from "@/components/stage/SeasonLights";
import { SleepingCat } from "@/components/models/SleepingCat";
import { TimerCamera } from "@/components/stage/TimerCamera";
import { useOnScreen } from "@/hooks/useOnScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSunClock } from "@/hooks/useSunClock";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { sunState } from "@/lib/scene/sunClock";
import { formatTime } from "@/lib/time";

interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
  "--dusk": number;
}

interface BreakSceneProps {
  remaining: number;
  /** How far through the break the clock is, from 0 to 1: where the sun sits. */
  clockProgress: number;
  /** How fast the clock advances, per second: 0 while paused. */
  clockRate: number;
  season: SeasonId;
  immersive?: boolean;
}

/**
 * The break, as a view of its own: a cat asleep on a pillow beside a steaming mug. The time sits at
 * the top and a thin bar along the bottom fills as the break runs out; nothing else competes for
 * the room. The sun still sets the light, and the sky darkens with it.
 */
export function BreakScene({
  remaining,
  clockProgress,
  clockRate,
  season,
  immersive = false,
}: BreakSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(container);
  const reduced = useReducedMotion();
  const clock = useSunClock(clockProgress, clockRate, reduced, visible);
  const labelId = useId();
  const timerLabelId = useId();
  const theme = SEASON_THEMES[season];
  const sun = sunState(clockProgress);
  const style: SeasonStyle = {
    "--season-glow": theme.css.glow,
    "--season-sun": theme.css.sun,
    "--dusk": sun.dusk,
  };
  const classes = ["solanum-scene", "is-break", `is-${season}`];
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")} style={style}>
      <TimeHeader remaining={remaining} reduced={reduced} caption="Break time" />
      <SceneBoundary fallback={<BreakFallback />}>
        {/* Nothing is drawn while the model loads: the placeholder is only for when WebGL fails. */}
        <Suspense fallback={null}>
          <Canvas
            orthographic
            dpr={[1, 1.5]}
            frameloop={visible && !reduced ? "always" : "demand"}
            fallback={<BreakFallback />}
            role="img"
            aria-labelledby={labelId}
          >
            <TimerCamera bounds={BREAK_SCENE.bounds} center={BREAK_SCENE.center} />
            <SeasonLights theme={theme} daylight={sun} daylightRef={clock.sun} showGlow={false} />
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
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <ProgressBar clock={clock} progress={clockProgress} label="Break progress" />
      <SrLabel id={labelId}>A cat sleeping beside a cup of coffee</SrLabel>
      <SrLabel id={timerLabelId}>Break time remaining</SrLabel>
      <span role="timer" aria-labelledby={timerLabelId} className="sol:sr-only">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
