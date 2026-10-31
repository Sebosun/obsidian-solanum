import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { cropStage } from "@/lib/crops/growth";
import type { CropId } from "@/lib/crops/catalog";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { sunState } from "@/lib/scene/sunClock";
import { CropSwap } from "@/components/scene/CropSwap";
import { GrowingCrop } from "@/components/scene/GrowingCrop";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { CropFallback } from "@/components/crops/CropFallback";
import { SeasonScenery } from "@/components/scene/SeasonScenery";
import { SunClockFace } from "@/components/clock/SunClockFace";
import { useSunClock } from "@/hooks/useSunClock";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatTime } from "@/lib/time";
import { CompletionFlourish } from "@/components/scene/CompletionFlourish";
import { TimerCamera } from "@/components/scene/TimerCamera";

interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
  "--dusk": number;
}

interface CropSceneProps {
  crop?: CropId;
  progress: number;
  running: boolean;
  immersive?: boolean;
  remaining: number;
  /** How far through the running phase the clock is, from 0 to 1: where the sun sits. */
  clockProgress: number;
  /** How fast the clock advances, per second: 0 while paused or waiting. */
  clockRate: number;
  season: SeasonId;
}

export function CropScene({
  crop = "tomato",
  progress,
  running,
  immersive = false,
  remaining,
  clockProgress,
  clockRate,
  season,
}: CropSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const clock = useSunClock(clockProgress, clockRate, reduced, visible);
  const stage = cropStage(progress);
  const moving = running && visible && !reduced;
  // Weather keeps drifting while the scene is on screen, even before a crop is planted.
  const animate = visible && !reduced;
  const theme = SEASON_THEMES[season];
  const sun = sunState(clockProgress);
  const seasonStyle: SeasonStyle = {
    "--season-glow": theme.css.glow,
    "--season-sun": theme.css.sun,
    "--dusk": sun.dusk,
  };
  const fallback = <CropFallback crop={crop} progress={progress} />;
  const classes = ["solanum-scene", `is-${season}`];
  if (progress >= 1) classes.push("is-mature");
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")} style={seasonStyle}>
      <SunClockFace
        clock={clock}
        progress={clockProgress}
        remaining={remaining}
        reduced={reduced}
      />
      <SceneBoundary resetKey={crop} fallback={fallback}>
        <Suspense fallback={fallback}>
          <Canvas
            orthographic
            dpr={[1, 1.5]}
            frameloop={animate ? "always" : "demand"}
            fallback={fallback}
            aria-label="Growing crop"
          >
            <TimerCamera />
            <SeasonScenery
              season={season}
              animate={animate}
              daylight={sun}
              daylightRef={clock.sun}
            />
            <CompletionFlourish reduced={reduced}>
              <CropSwap crop={crop} reduced={reduced}>
                {(planted) => (
                  <GrowingCrop
                    key={planted}
                    crop={planted}
                    stage={stage}
                    moving={moving}
                    reduced={reduced}
                  />
                )}
              </CropSwap>
            </CompletionFlourish>
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <span role="timer" aria-label="Remaining time" className="sol:sr-only">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
