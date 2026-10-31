import { Suspense, useId, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import type { HarvestBlocks } from "@/lib/harvest/month";
import { HARVEST_BLOCKS, HARVEST_SCENE } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";
import { SrLabel } from "@/components/app/SrLabel";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { SeasonLights } from "@/components/scene/SeasonLights";
import { HarvestBlockMesh } from "@/components/harvest/HarvestBlockMesh";
import { HarvestLoading } from "@/components/harvest/HarvestLoading";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";

interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
}

interface HarvestMonthSceneProps {
  layout: HarvestBlocks;
  season: SeasonId;
}

const PLINTH = "#4a3f33";
const PLINTH_MARGIN = 0.5;
const PLINTH_HEIGHT = 0.2;
/** Tallest block plus the plants above it, so the camera always fits the full height. */
const SPACER_HEIGHT = 2.6;

export function HarvestMonthScene({ layout, season }: HarvestMonthSceneProps) {
  const services = useServices();
  const reduced = useReducedMotion();
  const labelId = useId();
  const [attempt, setAttempt] = useState(0);
  const theme = SEASON_THEMES[season];
  const width = layout.columns * HARVEST_BLOCKS.pitch + PLINTH_MARGIN;
  const depth = layout.rows * HARVEST_BLOCKS.pitch + PLINTH_MARGIN;
  const style: SeasonStyle = {
    aspectRatio: HARVEST_SCENE.aspectRatio,
    "--season-glow": theme.css.glow,
    "--season-sun": theme.css.sun,
  };

  function retry() {
    getCropAssets(services).retry();
    setAttempt(attempt + 1);
  }
  const fallback = <HarvestUnavailable onRetry={retry} />;

  return (
    <SceneBoundary key={attempt} fallback={fallback}>
      <div className={`solanum-harvest-scene is-${season}`} style={style}>
        <SrLabel id={labelId}>Blocks showing this month's harvests</SrLabel>
        <Suspense fallback={<HarvestLoading onRetry={retry} />}>
          <Canvas
            orthographic
            camera={{ position: HARVEST_SCENE.cameraPosition, zoom: HARVEST_SCENE.initialZoom }}
            dpr={[1, 1.5]}
            frameloop="demand"
            fallback={fallback}
            role="img"
            aria-labelledby={labelId}
          >
            <SeasonLights theme={theme} showGlow={false} />
            <Bounds fit clip observe margin={HARVEST_SCENE.fitMargin}>
              <group>
                {/* Invisible and never animated, so the camera fits the whole grid while it rises. */}
                <mesh visible={false} position={[0, SPACER_HEIGHT / 2, 0]}>
                  <boxGeometry args={[width, SPACER_HEIGHT, depth]} />
                </mesh>
                <mesh name="month-plinth" position={[0, -PLINTH_HEIGHT / 2, 0]}>
                  <boxGeometry args={[width, PLINTH_HEIGHT, depth]} />
                  <meshStandardMaterial color={PLINTH} roughness={1} />
                </mesh>
                {layout.blocks.map((block, index) => (
                  <HarvestBlockMesh
                    key={block.key}
                    block={block}
                    index={index}
                    season={season}
                    reduced={reduced}
                  />
                ))}
              </group>
            </Bounds>
          </Canvas>
        </Suspense>
      </div>
    </SceneBoundary>
  );
}
