export interface CelebrationFrame {
  lift: number;
  scale: number;
  ringScale: number;
  ringOpacity: number;
  done: boolean;
}

export function celebrationFrame(elapsed: number, reducedMotion = false): CelebrationFrame {
  const progress = Math.min(1, Math.max(0, elapsed / 1.2));
  if (progress >= 1 || reducedMotion)
    return { lift: 0, scale: 1, ringScale: 1.45, ringOpacity: 0, done: true };
  const pulse = Math.sin(progress * Math.PI);
  return {
    lift: pulse * 0.06,
    scale: 1 + pulse * 0.035,
    ringScale: 1 + progress * 0.45,
    ringOpacity: (1 - progress) * 0.35,
    done: false,
  };
}
