import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MathUtils } from "three";
import { MS_PER_SECOND } from "@/lib/time";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { frameStep } from "@/lib/scene/motion";
import { sunState, type SunState } from "@/lib/scene/sunClock";

/** Close enough to the target to stop drawing frames. */
const SETTLED = 1e-4;

export type SunListener = (state: SunState) => void;

export interface SunClock {
  /** The sun as it is drawn right now, for whatever reads it every frame. */
  sun: MutableRefObject<SunState>;
  /** Calls the listener with each new state; returns a function that stops it. */
  subscribe(listener: SunListener): () => void;
}

/**
 * The sun's state, animated outside the 3D scene. `target` is the progress the clock last reported
 * and `rate` how fast it advances per second, so the sun keeps moving between the clock's ticks and
 * eases towards each new reading instead of stepping once a second. Under reduced motion, or while
 * `active` is false (the scene is off screen), it just shows the target and draws no frames.
 */
export function useSunClock(
  target: number,
  rate: number,
  reduced: boolean,
  active = true,
): SunClock {
  const sun = useRef(sunState(target));
  const listeners = useRef(new Set<SunListener>());

  const publish = useCallback((progress: number) => {
    sun.current = sunState(progress);
    for (const listener of listeners.current) listener(sun.current);
  }, []);

  useEffect(() => {
    if (reduced || !active) {
      publish(target);
      return;
    }
    let shown = sun.current.progress;
    let seconds = 0;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const step = frameStep((now - last) / MS_PER_SECOND);
      last = now;
      seconds += step;
      const predicted = Math.min(1, target + rate * seconds);
      shown = MathUtils.damp(shown, predicted, SUN_CLOCK.smoothing, step);
      if (rate === 0 && Math.abs(predicted - shown) < SETTLED) {
        publish(predicted);
        return;
      }
      publish(shown);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, rate, reduced, active, publish]);

  const subscribe = useCallback((listener: SunListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return useMemo(() => ({ sun, subscribe }), [subscribe]);
}
