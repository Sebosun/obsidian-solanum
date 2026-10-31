import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AnimationMixer, LoopRepeat } from "three";
import { useCatModel } from "@/hooks/useCatModel";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { frameStep } from "@/lib/scene/motion";

interface SleepingCatProps {
  /** Holds the pose instead of breathing. */
  reduced: boolean;
}

const CLIP = "Sleep";

/** The cat, asleep: breathing, an ear flick now and then, the tail stirring. */
export function SleepingCat({ reduced }: SleepingCatProps) {
  const { scene, animations } = useCatModel();
  const invalidate = useThree((state) => state.invalidate);
  const cat = useMemo(() => scene.clone(true), [scene]);
  const mixer = useMemo(() => new AnimationMixer(cat), [cat]);
  useEffect(() => {
    const clip = animations.find((item) => item.name === CLIP) ?? animations[0];
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.setLoop(LoopRepeat, Infinity).play();
    mixer.update(0);
    invalidate();
    return () => {
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(cat);
    };
  }, [mixer, animations, cat, invalidate]);
  useFrame((_state, delta) => {
    // A stalled frame must not leap through the breath.
    if (!reduced) mixer.update(frameStep(delta));
  });
  const { scale, sink, turn } = BREAK_SCENE.cat;
  return (
    <group name="sleeping-cat" position={[0, -sink, 0]} rotation={[0, turn, 0]} scale={scale}>
      <primitive object={cat} dispose={null} />
    </group>
  );
}
