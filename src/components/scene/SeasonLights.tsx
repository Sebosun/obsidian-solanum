import type { SeasonTheme } from "@/lib/scene/seasons";
import { SunHalo } from "@/components/scene/SunHalo";

interface SeasonLightsProps {
  theme: SeasonTheme;
  /** The summer sun and its halo are sized for the timer scene; larger scenes switch them off. */
  showGlow?: boolean;
}

export function SeasonLights({ theme, showGlow = true }: SeasonLightsProps) {
  const { ambient, sun, glow } = theme;
  return (
    <>
      <ambientLight name="season-ambient" color={ambient.color} intensity={ambient.intensity} />
      <directionalLight
        name="season-sun"
        color={sun.color}
        intensity={sun.intensity}
        position={sun.position}
      />
      {glow && showGlow && (
        <>
          <pointLight
            name="season-glow-light"
            color={glow.color}
            intensity={glow.intensity}
            position={glow.position}
            distance={8}
            decay={1.4}
          />
          <SunHalo color={glow.haloColor} position={glow.position} />
        </>
      )}
    </>
  );
}
