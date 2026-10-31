import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { STILL_STEAM_SECONDS, createSteamMaterial, steamSeeds } from "@/lib/scene/steam";

/** Longest simulated step, so a stalled frame cannot skip through the rise. */
const MAX_STEP_SECONDS = 0.1;

interface SteamProps {
  /** Frozen mid-rise instead of moving. */
  reduced: boolean;
}

/** Wisps that climb from the coffee, turning slowly round as they rise and fading as they spread. */
export function Steam({ reduced }: SteamProps) {
  const camera = useThree((state) => state.camera);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  const invalidate = useThree((state) => state.invalidate);
  const material = useMemo(createSteamMaterial, []);
  const seeds = useMemo(() => steamSeeds(BREAK_SCENE.steam.count), []);
  const elapsed = useRef(0);
  const positions = useMemo(() => new Float32Array(BREAK_SCENE.steam.count * 3), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    if (reduced) {
      material.uniforms.uTime.value = STILL_STEAM_SECONDS;
      invalidate();
    }
  }, [reduced, material, invalidate]);
  useFrame((_state, delta) => {
    // Sizes are in world units, drawn in pixels: scale by how many pixels a unit takes.
    material.uniforms.uPixelsPerUnit.value = camera.zoom * pixelRatio;
    if (reduced) return;
    // A stalled frame must not throw the plume forwards.
    elapsed.current += Math.min(delta, MAX_STEP_SECONDS);
    material.uniforms.uTime.value = elapsed.current;
  });
  return (
    <points name="steam" frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
    </points>
  );
}
