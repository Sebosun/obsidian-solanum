import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { cropStage } from "@/lib/crops/growth";
import type { CropId } from "@/lib/crops/catalog";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { SeasonScenery } from "@/components/scene/SeasonScenery";
import { CropSwap } from "@/components/scene/CropSwap";
import { GrowingCrop } from "@/components/scene/GrowingCrop";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { CropFallback } from "@/components/crops/CropFallback";
import { SceneCountdown } from "@/components/scene/SceneCountdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSceneColor } from "@/hooks/useSceneColor";
import { formatTime } from "@/lib/time";
import { CompletionFlourish } from "@/components/scene/CompletionFlourish";
import { TimerCamera } from "@/components/scene/TimerCamera";

interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
}

interface CropSceneProps {
  crop?: CropId;
  progress: number;
  running: boolean;
  immersive?: boolean;
  remaining: number;
  season: SeasonId;
}

export function CropScene({
  crop = "tomato",
  progress,
  running,
  immersive = false,
  remaining,
  season,
}: CropSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const color = useSceneColor(container);
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const stage = cropStage(progress);
  const moving = running && visible && !reduced;
  // Weather keeps drifting while the scene is on screen, even before a crop is planted.
  const animate = visible && !reduced;
  const theme = SEASON_THEMES[season];
  const seasonStyle: SeasonStyle = {
    "--season-glow": theme.css.glow,
    "--season-sun": theme.css.sun,
  };
  const fallback = <CropFallback crop={crop} progress={progress} remaining={remaining} />;
  const classes = ["solanum-scene", `is-${season}`];
  if (progress >= 1) classes.push("is-mature");
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")} style={seasonStyle}>
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
            <SceneCountdown remaining={remaining} color={color} />
            <SeasonScenery season={season} animate={animate} />
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
