import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import type { HarvestDay } from "../../lib/harvest/model";
import { SceneBoundary } from "../scene/SceneBoundary";
import { HarvestDayPlot } from "./HarvestDayPlot";

export function HarvestScene({
  days,
  activeKey,
  assetUrl,
  onHover,
  onSelect,
}: {
  days: HarvestDay[];
  activeKey: string | null;
  assetUrl: (name: string) => string;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
}) {
  const fallback = (
    <p className="solanum-hint sol:p-4">
      3D view unavailable. The day list below contains all crops and details.
    </p>
  );
  return (
    <div className="solanum-harvest-scene">
      <SceneBoundary fallback={fallback}>
        <Suspense
          fallback={
            <p role="status" className="solanum-hint sol:p-4">
              Preparing your farm…
            </p>
          }
        >
          <Canvas
            orthographic
            camera={{ position: [2, 11, 9], zoom: 30 }}
            dpr={[1, 1.5]}
            frameloop="demand"
            fallback={fallback}
            onPointerMissed={() => onHover(null)}
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
