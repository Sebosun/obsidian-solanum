import { CROP_SWAP, PLOT_ENTRANCE } from "@/lib/scene/constants";

/** Eases 0→1 with a small overshoot past 1 before settling. `overshoot` ≈ 1.7 gives ~10%. */
export function easeOutBack(t: number, overshoot: number): number {
  const shifted = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

export interface SwapFrame {
  scale: number;
  /** Rotation about the vertical axis, in radians. */
  spin: number;
  done: boolean;
}

/** One frame of a crop entering ("in") or leaving ("out") the planter. */
export function swapFrame(direction: "in" | "out", elapsed: number, reduced = false): SwapFrame {
  const resting: SwapFrame =
    direction === "in" ? { scale: 1, spin: 0, done: true } : { scale: 0, spin: 0, done: true };
  const progress = Math.min(1, Math.max(0, elapsed / CROP_SWAP.durationSeconds));
  if (reduced || progress >= 1) return resting;
  if (direction === "in") {
    return {
      scale: Math.max(0, easeOutBack(progress, CROP_SWAP.overshoot)),
      spin: -(1 - progress) * CROP_SWAP.spinRadians,
      done: false,
    };
  }
  return { scale: 1 - progress * progress, spin: progress * CROP_SWAP.spinRadians, done: false };
}

/** One frame of calendar plot number `index` rising in; plots start a beat apart. */
export function plotEntrance(
  elapsed: number,
  index: number,
  reduced = false,
): { scale: number; done: boolean } {
  if (reduced) return { scale: 1, done: true };
  const local = elapsed - index * PLOT_ENTRANCE.staggerSeconds;
  if (local <= 0) return { scale: 0, done: false };
  if (local >= PLOT_ENTRANCE.durationSeconds) return { scale: 1, done: true };
  return {
    scale: Math.max(0, easeOutBack(local / PLOT_ENTRANCE.durationSeconds, PLOT_ENTRANCE.overshoot)),
    done: false,
  };
}
