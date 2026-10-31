import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState, type SunState } from "@/lib/scene/sunClock";

/** Longest simulated step, so a stalled frame cannot throw the sun across the sky. */
const MAX_STEP_SECONDS = 0.1;

/**
 * The sun's state, updated every frame. `target` is the progress the clock last reported and
 * `rate` how fast it advances per second, so the sun keeps moving between the clock's ticks and
 * eases towards each new reading instead of stepping once a second. Under reduced motion it
 * simply shows the target.
 */
export function useSunProgress(
  target: number,
  rate: number,
  reduced: boolean,
): MutableRefObject<SunState> {
  const state = useRef(sunState(target));
  const shown = useRef(state.current.progress);
  const anchor = useRef({ value: target, seconds: 0 });

  useEffect(() => {
    anchor.current = { value: target, seconds: 0 };
  }, [target]);

  useFrame((_frame, delta) => {
    const step = Math.min(Math.max(delta, 0), MAX_STEP_SECONDS);
    anchor.current.seconds += step;
    if (reduced) {
      shown.current = sunState(target).progress;
    } else {
      const predicted = Math.min(1, anchor.current.value + rate * anchor.current.seconds);
      shown.current = MathUtils.damp(shown.current, predicted, SUN_CLOCK.smoothing, step);
    }
    state.current = sunState(shown.current);
  });

  return state;
}
