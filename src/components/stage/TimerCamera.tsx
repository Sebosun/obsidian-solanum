import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
import { fitTimerCamera, type SceneBounds } from "@/lib/scene/framing";

interface TimerCameraProps {
  /** What to keep in view; the crop plot unless given. */
  bounds?: SceneBounds;
}

export function TimerCamera({ bounds }: TimerCameraProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return;
    fitTimerCamera(camera, size, bounds);
    invalidate();
  }, [camera, size, bounds, invalidate]);
  return null;
}
