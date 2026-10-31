import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { cropStage } from "../../lib/crops/growth";
import type { CropId } from "../../lib/crops/catalog";
import { Plant } from "../scene/Plant";
import { SceneBoundary } from "../scene/SceneBoundary";
import { CropFallback } from "./CropFallback";
import { SceneCountdown } from "../scene/SceneCountdown";
import { useSceneColor } from "../../hooks/useSceneColor";
import { formatTime } from "../../lib/time";
import { useServices } from "../../state/hooks";

export function CropScene({
  crop = "tomato",
  progress,
  running,
  immersive = false,
  remaining,
}: {
  crop?: CropId;
  progress: number;
  running: boolean;
  immersive?: boolean;
  remaining: number;
}) {
  const { assetUrl } = useServices();
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
  function aimCamera({ camera }: RootState) {
    camera.lookAt(0, -0.05, 0);
  }
  return (
    <div
      ref={container}
      className={`solanum-scene ${progress >= 1 ? "is-mature" : ""} ${immersive ? "is-immersive" : ""}`}
    >
      <SceneBoundary key={crop} fallback={fallback}>
        <Suspense fallback={fallback}>
          <Canvas
            camera={{ position: [3.2, 2.3, 3.6], fov: 36 }}
            dpr={[1, 1.5]}
            frameloop={moving ? "always" : "demand"}
            fallback={fallback}
            onCreated={aimCamera}
            aria-label="Growing crop"
          >
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
            {stage > 0 ? (
              <group position={[0, -0.55, 0]}>
                <Plant
                  key={`${crop}-${stage}`}
                  crop={crop}
                  stage={stage}
                  assetUrl={assetUrl}
                  moving={moving}
                />
              </group>
            ) : (
              <mesh position={[0, -0.48, 0]} scale={[1, 0.55, 0.7]}>
                <sphereGeometry args={[0.09, 12, 8]} />
                <meshStandardMaterial color="#e8bb77" />
              </mesh>
            )}
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <span role="timer" aria-label="Remaining time" className="sol:sr-only">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
