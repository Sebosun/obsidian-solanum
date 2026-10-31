import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useModel } from "@/hooks/useModel";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { prepareBaked } from "@/lib/models/baked";
import { frameStep } from "@/lib/scene/motion";
import type { SunState } from "@/lib/scene/sunClock";
import { Steam } from "@/components/models/Steam";
import { useBakedModel } from "@/components/models/useBakedModel";

interface CoffeeMugProps {
  reduced: boolean;
  /** The sun as animated frame by frame; the baked mug dims as the light fades. */
  daylightRef?: MutableRefObject<SunState>;
}

/** The mug of coffee, with steam rising from it. */
export function CoffeeMug({ reduced, daylightRef }: CoffeeMugProps) {
  const { scene } = useModel(BREAK_SCENE.mug.model);
  const { position, height, coffeeLevel, turn, hover, bob, bobSeconds } = BREAK_SCENE.mug;
  const floating = useRef<Group>(null);
  const elapsed = useRef(0);
  const mug = useMemo(() => prepareBaked(scene, { size: { height } }), [scene, height]);
  useBakedModel(mug, daylightRef);
  useFrame((_state, delta) => {
    // It hangs in the air, rising and sinking slowly; a stalled frame must not make it jump.
    if (!reduced && floating.current) {
      elapsed.current += frameStep(delta);
      floating.current.position.y =
        BREAK_SCENE.groundY + hover + Math.sin((elapsed.current / bobSeconds) * Math.PI * 2) * bob;
    }
  });
  return (
    <group
      ref={floating}
      name="coffee-mug"
      position={[position[0], BREAK_SCENE.groundY + hover, position[1]]}
      rotation={[0, turn, 0]}
    >
      <group scale={mug.factor}>
        <primitive object={mug.object} dispose={null} />
      </group>
      <group position={[0, height * coffeeLevel, 0]}>
        <Steam reduced={reduced} />
      </group>
    </group>
  );
}
