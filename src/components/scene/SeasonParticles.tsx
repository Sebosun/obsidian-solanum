import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { BufferAttribute, Points } from "three";
import { createDotTexture } from "@/lib/scene/dotTexture";
import { ParticleField, type ParticleBounds } from "@/lib/scene/particles";
import type { SeasonTheme } from "@/lib/scene/seasons";

interface SeasonParticlesProps {
  theme: SeasonTheme;
  /** When false the particles are drawn once and stay still. */
  animate: boolean;
}

/** World-space volume the particles live in, around the crop platform. */
const PARTICLE_BOUNDS: ParticleBounds = { halfWidth: 1.5, halfDepth: 1, floor: -0.6, ceiling: 1.7 };
const FIELD_SEED = 20_261_031;

export function SeasonParticles({ theme, animate }: SeasonParticlesProps) {
  const { particles } = theme;
  const field = useMemo(
    () => new ParticleField(particles, PARTICLE_BOUNDS, FIELD_SEED),
    [particles],
  );
  const points = useRef<Points>(null);
  const sprite = useMemo(createDotTexture, []);
  const devicePixelRatio = useThree((state) => state.viewport.dpr);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [field, invalidate]);

  useFrame((state, delta) => {
    if (!animate || !points.current) return;
    field.step(delta, state.clock.elapsedTime);
    const position = points.current.geometry.getAttribute("position") as BufferAttribute;
    position.needsUpdate = true;
  });

  return (
    <points key={theme.id} ref={points} name="season-particles" renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[field.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        alphaTest={0.02}
        size={particles.size * devicePixelRatio}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
