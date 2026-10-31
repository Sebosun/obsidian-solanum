import { useEffect, useMemo } from "react";
import { createCountdownGeometry } from "@/lib/scene/clockGeometry";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunClockPlacement, sunState } from "@/lib/scene/sunClock";

interface SunClockProps {
  /** How far through the current phase, from 0 to 1. */
  progress: number;
  /** Milliseconds left, shown as the large faint digits. */
  remaining: number;
  /** Colour of the digits and the arc, taken from the theme's text. */
  color: string;
}

const ARC_DOT_RADIUS = { major: 0.08, minor: 0.04 };
const ARC_DOT_OPACITY = { major: 0.4, minor: 0.22 };
const MAJOR_EVERY = 10;
const DIGIT_DEPTH_OFFSET = 0.02;

function arcDots() {
  return Array.from({ length: SUN_CLOCK.arcDots + 1 }, (_, i) => {
    const angle = Math.PI - (i / SUN_CLOCK.arcDots) * Math.PI;
    return {
      key: i,
      major: i % MAJOR_EVERY === 0,
      x: Math.cos(angle) * SUN_CLOCK.arcRadiusX,
      y: Math.sin(angle) * SUN_CLOCK.arcRadiusY,
    };
  });
}

/** The countdown as weather: a sun crossing the sky behind the crop, the time faint across it. */
export function SunClock({ progress, remaining, color }: SunClockProps) {
  const placement = useMemo(sunClockPlacement, []);
  const dots = useMemo(arcDots, []);
  const sun = sunState(progress);
  const digits = useMemo(
    () => createCountdownGeometry(remaining, SUN_CLOCK.digitSize),
    [remaining],
  );
  useEffect(() => () => digits.dispose(), [digits]);
  const { start, end } = SUN_CLOCK.digitOpacity;
  const digitOpacity = start + (end - start) * Math.min(1, Math.max(0, progress));

  return (
    <group name="sun-clock" position={placement.position} quaternion={placement.quaternion}>
      {dots.map((dot) => {
        const size = dot.major ? "major" : "minor";
        return (
          <mesh key={dot.key} position={[dot.x, dot.y, 0]}>
            <circleGeometry args={[ARC_DOT_RADIUS[size], 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={ARC_DOT_OPACITY[size]}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      <group name="clock-sun" position={[sun.x, sun.y, 0.05]} scale={sun.scale}>
        {SUN_CLOCK.sunLayers.map((layer) => (
          <mesh key={layer.radius} name="clock-sun-layer">
            <circleGeometry args={[layer.radius, 28]} />
            <meshBasicMaterial
              color={sun.colorCss}
              transparent
              opacity={layer.opacity * sun.brightness}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <mesh
        name="clock-digits"
        geometry={digits}
        position={[0, SUN_CLOCK.digitY, DIGIT_DEPTH_OFFSET]}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={digitOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
