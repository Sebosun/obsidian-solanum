import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { cropStage } from "@/lib/crops/growth";
import type { CropId } from "@/lib/crops/catalog";
import { GrowingCrop } from "@/components/scene/GrowingCrop";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { CropFallback } from "@/components/crops/CropFallback";
import { SceneCountdown } from "@/components/scene/SceneCountdown";
import { useSceneColor } from "@/hooks/useSceneColor";
import { formatTime } from "@/lib/time";
import { CompletionFlourish } from "@/components/scene/CompletionFlourish";
import { TimerCamera } from "@/components/scene/TimerCamera";

interface CropSceneProps {
  crop?: CropId;
  progress: number;
  running: boolean;
  immersive?: boolean;
  remaining: number;
}

export function CropScene({
  crop = "tomato",
  progress,
  running,
  immersive = false,
  remaining,
}: CropSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const color = useSceneColor(container);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  const stage = cropStage(progress);
  const moving = running && visible && !reduced;
  const fallback = <CropFallback crop={crop} progress={progress} remaining={remaining} />;
  const classes = ["solanum-scene"];
  if (progress >= 1) classes.push("is-mature");
  if (immersive) classes.push("is-immersive");
  return (
    <div ref={container} className={classes.join(" ")}>
      <SceneBoundary key={crop} fallback={fallback}>
        <Suspense fallback={fallback}>
          <Canvas
            orthographic
            dpr={[1, 1.5]}
            frameloop={moving ? "always" : "demand"}
            fallback={fallback}
            aria-label="Growing crop"
          >
            <TimerCamera />
            <ambientLight intensity={1.8} />
            <directionalLight position={[3, 5, 2]} intensity={3} color="#fff0ce" />
            <SceneCountdown remaining={remaining} color={color} />
            <mesh position={[0, -0.68, 0]}>
              <cylinderGeometry args={[0.95, 0.8, 0.25, 8]} />
              <meshStandardMaterial color="#77513a" roughness={1} />
            </mesh>
            <mesh position={[0, -0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.9, 8]} />
              <meshStandardMaterial color="#493324" />
            </mesh>
            <CompletionFlourish reduced={reduced}>
              <GrowingCrop key={crop} crop={crop} stage={stage} moving={moving} reduced={reduced} />
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
