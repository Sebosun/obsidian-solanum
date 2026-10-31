import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshBasicMaterial } from "three";
import { ClockDigits } from "@/components/scene/ClockDigits";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunClockPlacement, sunState, type SunState } from "@/lib/scene/sunClock";
import { formatTime } from "@/lib/time";

interface SunClockProps {
  /** The sun as it is drawn, updated every frame by `useSunProgress`. */
  sun: MutableRefObject<SunState>;
  /** The progress last reported by the timer, used for what is drawn before the first frame. */
  progress: number;
  /** Milliseconds left, shown as the large faint digits. */
  remaining: number;
  /** Colour of the digits and the arc, taken from the theme's text. */
  color: string;
  reduced: boolean;
}

const ARC_DOT_RADIUS = { major: 0.08, minor: 0.04 };
const ARC_DOT_OPACITY = { major: 0.4, minor: 0.22 };
const MAJOR_EVERY = 10;
const SUN_DEPTH_OFFSET = 0.05;

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
export function SunClock({ sun, progress, remaining, color, reduced }: SunClockProps) {
  const placement = useMemo(sunClockPlacement, []);
  const dots = useMemo(arcDots, []);
  const initial = sunState(progress);
  const group = useRef<Group>(null);
  const layers = useRef<(MeshBasicMaterial | null)[]>([]);

  // Move the sun every frame from the animated state, not once a second from the props.
  useFrame(() => {
    const now = sun.current;
    group.current?.position.set(now.x, now.y, SUN_DEPTH_OFFSET);
    group.current?.scale.setScalar(now.scale);
    layers.current.forEach((material, index) => {
      if (!material) return;
      material.opacity = SUN_CLOCK.sunLayers[index].opacity * now.brightness;
      material.color.set(now.colorCss);
    });
  });

  const { start, end } = SUN_CLOCK.digitOpacity;
  const digitOpacity = start + (end - start) * initial.progress;

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
      <group
        ref={group}
        name="clock-sun"
        position={[initial.x, initial.y, SUN_DEPTH_OFFSET]}
        scale={initial.scale}
      >
        {SUN_CLOCK.sunLayers.map((layer, index) => (
          <mesh key={layer.radius} name="clock-sun-layer">
            <circleGeometry args={[layer.radius, 28]} />
            <meshBasicMaterial
              ref={(material) => {
                layers.current[index] = material;
              }}
              color={initial.colorCss}
              transparent
              opacity={layer.opacity * initial.brightness}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <group name="clock-digits" position={[0, SUN_CLOCK.digitY, 0.02]}>
        <ClockDigits
          text={formatTime(remaining)}
          size={SUN_CLOCK.digitSize}
          color={color}
          opacity={digitOpacity}
          reduced={reduced}
        />
      </group>
    </group>
  );
}
