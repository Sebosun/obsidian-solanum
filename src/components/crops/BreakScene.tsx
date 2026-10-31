import { Suspense, useId, useRef, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { SrLabel } from "@/components/app/SrLabel";
import { BreakFallback } from "@/components/crops/BreakFallback";
import { SunClockFace } from "@/components/clock/SunClockFace";
import { CoffeeMug } from "@/components/scene/CoffeeMug";
import { FuzzyPillow } from "@/components/scene/FuzzyPillow";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { SeasonLights } from "@/components/scene/SeasonLights";
import { SleepingCat } from "@/components/scene/SleepingCat";
import { TimerCamera } from "@/components/scene/TimerCamera";
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

/** What the sleeping cat rests on: the top of the pillow, a little below the pile of fur. */
const CAT_REST = BREAK_SCENE.pillow.height * 0.93;

/**
 * The break, as a view of its own: a cat asleep on a fuzzy pillow beside a steaming mug, under the
 * same sun that counts the time down.
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
  const { pillow } = BREAK_SCENE;
  const classes = ["solanum-scene", "is-break", `is-${season}`];
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")} style={style}>
      <SunClockFace
        clock={clock}
        progress={clockProgress}
        remaining={remaining}
        reduced={reduced}
        caption="Break time"
      />
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
            <TimerCamera bounds={BREAK_SCENE.bounds} />
            <SeasonLights theme={theme} daylight={sun} daylightRef={clock.sun} showGlow={false} />
            <FuzzyPillow daylightRef={clock.sun} />
            <group
              position={[pillow.position[0], BREAK_SCENE.groundY + CAT_REST, pillow.position[1]]}
              rotation={[0, pillow.turn, 0]}
            >
              <Suspense fallback={null}>
                <SleepingCat reduced={reduced} />
              </Suspense>
            </group>
            <Suspense fallback={null}>
              <CoffeeMug reduced={reduced} daylightRef={clock.sun} />
            </Suspense>
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <SrLabel id={labelId}>A cat sleeping beside a cup of coffee</SrLabel>
      <SrLabel id={timerLabelId}>Break time remaining</SrLabel>
      <span role="timer" aria-labelledby={timerLabelId} className="sol:sr-only">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
