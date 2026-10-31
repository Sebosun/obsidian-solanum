import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Hud, OrthographicCamera } from "@react-three/drei";
import { createCountdownGeometry } from "@/lib/scene/clockGeometry";
import { CLOCK_TYPOGRAPHY } from "@/lib/scene/constants";

interface SceneCountdownProps {
  remaining: number;
  color: string;
}

export function SceneCountdown({ remaining, color }: SceneCountdownProps) {
  const size = useThree((state) => state.size);
  const fontSize = Math.min(
    CLOCK_TYPOGRAPHY.maximumPixels,
    Math.max(CLOCK_TYPOGRAPHY.minimumPixels, size.width * CLOCK_TYPOGRAPHY.widthRatio),
  );
  const geometry = useMemo(
    () => createCountdownGeometry(remaining, fontSize),
    [remaining, fontSize],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const baseline = -size.height / 2 + CLOCK_TYPOGRAPHY.baselinePixels;
  return (
    <Hud renderPriority={CLOCK_TYPOGRAPHY.renderPriority}>
      <OrthographicCamera makeDefault position={CLOCK_TYPOGRAPHY.cameraPosition} />
      <mesh name="scene-countdown" geometry={geometry} position={[0, baseline, 0]}>
        <meshBasicMaterial color={color} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </Hud>
  );
}
