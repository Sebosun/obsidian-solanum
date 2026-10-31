import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight } from "three";
import type { SeasonTheme } from "@/lib/scene/seasons";
import type { SunState } from "@/lib/scene/sunClock";
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
  /** The sun as animated frame by frame; the light follows it smoothly between `daylight` updates. */
  daylightRef?: MutableRefObject<SunState>;
  /** The summer sun and its halo are sized for the timer scene; larger scenes switch them off. */
  showGlow?: boolean;
}

export function SeasonLights({ theme, daylight, daylightRef, showGlow = true }: SeasonLightsProps) {
  const { ambient, sun, glow } = theme;
  const ambientLight = useRef<AmbientLight>(null);
  const sunLight = useRef<DirectionalLight>(null);
  useFrame(() => {
    const now = daylightRef?.current;
    if (!now || !ambientLight.current || !sunLight.current) return;
    ambientLight.current.intensity = ambient.intensity * now.ambientFactor;
    sunLight.current.intensity = sun.intensity * now.lightFactor;
    sunLight.current.position.set(...now.lightPosition);
    sunLight.current.color.set(now.colorCss);
  });
  return (
    <>
      <ambientLight
        ref={ambientLight}
        name="season-ambient"
        color={ambient.color}
        intensity={ambient.intensity * (daylight?.ambientFactor ?? 1)}
      />
      <directionalLight
        ref={sunLight}
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
