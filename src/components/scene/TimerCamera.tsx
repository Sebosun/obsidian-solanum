import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
import { fitTimerCamera } from "@/lib/scene/framing";

export function TimerCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return;
    fitTimerCamera(camera, size);
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}
