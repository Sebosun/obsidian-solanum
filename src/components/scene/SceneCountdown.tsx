import { Billboard } from "@react-three/drei";
import { countdownSegments } from "../../lib/scene/countdown";

export function SceneCountdown({ remaining, color }: { remaining: number; color: string }) {
  const { segments } = countdownSegments(remaining);
  return (
    <Billboard position={[0, -1.2, 0.25]}>
      <group scale={0.7} name="scene-countdown">
        {segments.map((segment) => (
          <mesh key={segment.key} position={[segment.x, segment.y, 0]} renderOrder={5}>
            <planeGeometry args={[segment.width, segment.height]} />
            <meshBasicMaterial
              color={color}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </Billboard>
  );
}
