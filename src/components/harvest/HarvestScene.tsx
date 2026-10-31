import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, useGLTF } from "@react-three/drei";
import type { HarvestDay } from "../../lib/harvest/model";
import { CROPS } from "../../lib/crops/catalog";
import { cropStage } from "../../lib/crops/growth";
import { useServices } from "../../state/hooks";
import { SceneBoundary } from "../scene/SceneBoundary";
import { HarvestDayPlot } from "./HarvestDayPlot";
import { HarvestLoading } from "./HarvestLoading";
import { HarvestUnavailable } from "./HarvestUnavailable";

interface HarvestSceneProps {
  days: HarvestDay[];
  activeKey: string | null;
  onHover(key: string | null): void;
  onSelect(key: string): void;
}

export function HarvestScene({ days, activeKey, onHover, onSelect }: HarvestSceneProps) {
  const { assetUrl } = useServices();
  const [attempt, setAttempt] = useState(0);

  function retry() {
    const assets = new Set<string>();
    for (const day of days) {
      for (const item of day.items) {
        const model = CROPS[item.session.crop].model;
        const stage = Math.max(1, cropStage(item.progress));
        assets.add(assetUrl(`${model}_${stage}.glb`));
        assets.add(assetUrl(`${model}_4.glb`));
      }
    }
    assets.forEach((asset) => useGLTF.clear(asset));
    setAttempt(attempt + 1);
  }
  function clearHover() {
    onHover(null);
  }
  const fallback = <HarvestUnavailable onRetry={retry} />;

  return (
    <div className="solanum-harvest-scene">
      <SceneBoundary key={attempt} fallback={fallback}>
        <Suspense fallback={<HarvestLoading onRetry={retry} />}>
          <Canvas
            orthographic
            camera={{ position: [2, 11, 9], zoom: 30 }}
            dpr={[1, 1.5]}
            frameloop="demand"
            fallback={fallback}
            onPointerMissed={clearHover}
            aria-label="3D monthly harvest calendar"
          >
            <ambientLight intensity={2} />
            <directionalLight position={[2, 8, 4]} intensity={2.8} color="#fff2d6" />
            <Bounds fit clip observe margin={1.15}>
              <group>
                {days.map((day) => (
                  <HarvestDayPlot
                    key={day.key}
                    day={day}
                    active={day.key === activeKey}
                    assetUrl={assetUrl}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                ))}
              </group>
            </Bounds>
          </Canvas>
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
