import { HARVEST_FLOURISH } from "@/lib/scene/constants";

export interface CelebrationFrame {
  lift: number;
  scale: number;
  ringScale: number;
  ringOpacity: number;
  done: boolean;
}

export function celebrationFrame(elapsed: number, reducedMotion = false): CelebrationFrame {
  const progress = Math.min(1, Math.max(0, elapsed / HARVEST_FLOURISH.durationSeconds));
  if (progress >= 1 || reducedMotion)
    return {
      lift: 0,
      scale: 1,
      ringScale: 1 + HARVEST_FLOURISH.ringExpansion,
      ringOpacity: 0,
      done: true,
    };
  const pulse = Math.sin(progress * Math.PI);
  return {
    lift: pulse * HARVEST_FLOURISH.lift,
    scale: 1 + pulse * HARVEST_FLOURISH.scaleChange,
    ringScale: 1 + progress * HARVEST_FLOURISH.ringExpansion,
    ringOpacity: (1 - progress) * HARVEST_FLOURISH.ringOpacity,
    done: false,
  };
}
