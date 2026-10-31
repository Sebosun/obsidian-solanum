import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useBreakModel } from "@/hooks/useBreakModel";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { prepareMug } from "@/lib/scene/mug";
import type { SunState } from "@/lib/scene/sunClock";
import { Steam } from "@/components/scene/Steam";

interface CoffeeMugProps {
  reduced: boolean;
  /** The sun as animated frame by frame; the baked mug dims as the light fades. */
  daylightRef?: MutableRefObject<SunState>;
}

/** Longest simulated step, so a stalled frame cannot make the mug jump. */
const MAX_STEP_SECONDS = 0.1;
/** Never darker than this share of its baked colours, so the mug stays readable at dusk. */
const DIMMEST = 0.5;

/** The mug of coffee, with steam rising from it. */
export function CoffeeMug({ reduced, daylightRef }: CoffeeMugProps) {
  const { scene } = useBreakModel(BREAK_SCENE.mug.model);
  const { position, height, coffeeLevel, turn, hover, bob, bobSeconds } = BREAK_SCENE.mug;
  const floating = useRef<Group>(null);
  const elapsed = useRef(0);
  const mug = useMemo(() => prepareMug(scene, height), [scene, height]);
  useEffect(
    () => () => {
      mug.materials.forEach((material) => material.dispose());
    },
    [mug],
  );
  useFrame((_state, delta) => {
    // It hangs in the air, rising and sinking slowly; a stalled frame must not make it jump.
    if (!reduced && floating.current) {
      elapsed.current += Math.min(delta, MAX_STEP_SECONDS);
      floating.current.position.y =
        BREAK_SCENE.groundY + hover + Math.sin((elapsed.current / bobSeconds) * Math.PI * 2) * bob;
    }
    // The model is baked with its own light, so it does not react to the scene's: dim it by hand.
    const light = Math.min(1, daylightRef?.current.lightFactor ?? 1);
    for (const material of mug.materials) material.color.setScalar(DIMMEST + (1 - DIMMEST) * light);
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
