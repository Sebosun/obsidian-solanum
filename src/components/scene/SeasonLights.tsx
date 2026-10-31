import type { SeasonTheme } from "@/lib/scene/seasons";
import { SunHalo } from "@/components/scene/SunHalo";

/** The sun clock's state for the light: where the sun shines from and how much of it is left. */
export interface Daylight {
  lightFactor: number;
  ambientFactor: number;
  lightPosition: [number, number, number];
  colorCss: string;
}

interface SeasonLightsProps {
  theme: SeasonTheme;
  /** Makes the scene's light follow the sun clock instead of staying fixed. */
  daylight?: Daylight;
  /** The summer sun and its halo are sized for the timer scene; larger scenes switch them off. */
  showGlow?: boolean;
}

export function SeasonLights({ theme, daylight, showGlow = true }: SeasonLightsProps) {
  const { ambient, sun, glow } = theme;
  return (
    <>
      <ambientLight
        name="season-ambient"
        color={ambient.color}
        intensity={ambient.intensity * (daylight?.ambientFactor ?? 1)}
      />
      <directionalLight
        name="season-sun"
        color={daylight?.colorCss ?? sun.color}
        intensity={sun.intensity * (daylight?.lightFactor ?? 1)}
        position={daylight?.lightPosition ?? sun.position}
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
