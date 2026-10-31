import { useMemo, type MutableRefObject, type ReactNode } from "react";
import { useModel } from "@/hooks/useModel";
import { floorAtCentre, prepareBaked } from "@/lib/models/baked";
import { BREAK_SCENE } from "@/lib/scene/constants";
import type { SunState } from "@/lib/scene/sunClock";
import { useBakedModel } from "@/components/models/useBakedModel";

interface PillowProps {
  /** The sun as animated frame by frame; the baked pillow dims as the light fades. */
  daylightRef?: MutableRefObject<SunState>;
  /** What rests on the pillow, placed on the floor of its dish. */
  children?: ReactNode;
}

/** The pillow the cat sleeps on, with whatever lies on it standing on its floor. */
export function Pillow({ daylightRef, children }: PillowProps) {
  const { scene } = useModel(BREAK_SCENE.pillow.model);
  const { width, turn, position } = BREAK_SCENE.pillow;
  const pillow = useMemo(() => {
    const prepared = prepareBaked(scene, { size: { width }, centered: true });
    // Where the dish bottoms out, in the scene's units: the pillow stands on the ground at y=0.
    return { ...prepared, floor: floorAtCentre(prepared.object) * prepared.factor };
  }, [scene, width]);
  useBakedModel(pillow, daylightRef);
  return (
    <group
      name="pillow"
      position={[position[0], BREAK_SCENE.groundY, position[1]]}
      rotation={[0, turn, 0]}
    >
      <group scale={pillow.factor}>
        <primitive object={pillow.object} dispose={null} />
      </group>
      <group name="pillow-floor" position={[0, pillow.floor, 0]}>
        {children}
      </group>
    </group>
  );
}
