import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { BufferAttribute, BufferGeometry } from "three";
import type { SeasonTheme } from "@/lib/scene/seasons";
import { frameStep } from "@/lib/scene/motion";
import { WeatherField, type WeatherBounds } from "@/lib/scene/weather";
import { createWeatherMaterial } from "@/lib/scene/weatherShaders";

interface SeasonParticlesProps {
  theme: SeasonTheme;
  /** When false the weather is drawn once and holds still. */
  animate: boolean;
}

/**
 * World-space volume the weather fills, centred on the plot: the camera looks at height 0.25, so the
 * floor and ceiling sit as far below it as above, and it reaches as far to one side as to the other.
 */
const WEATHER_BOUNDS: WeatherBounds = { halfWidth: 1.3, halfDepth: 1, floor: -0.85, ceiling: 1.35 };
const FIELD_SEED = 20_261_031;
/** The attributes that change every frame. Colours and sizes are fixed. */
const MOVING_ATTRIBUTES = ["position", "aAlpha", "aRotation"] as const;

/** The season's weather: snow, petals, sunlit motes or leaves, each drawn by its own shader. */
export function SeasonParticles({ theme, animate }: SeasonParticlesProps) {
  const { particles } = theme;
  const field = useMemo(() => new WeatherField(particles, WEATHER_BOUNDS, FIELD_SEED), [particles]);
  const material = useMemo(() => createWeatherMaterial(particles.kind), [particles.kind]);
  const geometry = useRef<BufferGeometry>(null);
  const elapsed = useRef(0);
  const camera = useThree((state) => state.camera);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    field.step(elapsed.current);
    invalidate();
  }, [field, invalidate]);

  useFrame((_state, delta) => {
    material.uniforms.uPixelsPerUnit.value = camera.zoom * pixelRatio;
    if (!animate) return;
    elapsed.current += frameStep(delta);
    field.step(elapsed.current);
    material.uniforms.uTime.value = elapsed.current;
    for (const name of MOVING_ATTRIBUTES) {
      const attribute = geometry.current?.getAttribute(name) as BufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  });

  return (
    <points key={theme.id} name="season-particles" frustumCulled={false} material={material}>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[field.colors, 3]} />
        <bufferAttribute attach="attributes-aAlpha" args={[field.alphas, 1]} />
        <bufferAttribute attach="attributes-aRotation" args={[field.rotations, 2]} />
        <bufferAttribute attach="attributes-aSize" args={[field.sizes, 1]} />
      </bufferGeometry>
    </points>
  );
}
