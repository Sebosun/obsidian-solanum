import { GROWTH_MOTION } from "@/lib/scene/constants";

export interface GrowthLayerState {
  stage: number;
  opacity: number;
  scale: number;
}

export class GrowthTransition {
  private from: number;
  private target: number;
  private startedAt = 0;

  constructor(stage: number) {
    this.from = stage;
    this.target = stage;
  }

  retarget(stage: number, now: number, reducedMotion = false): void {
    if (reducedMotion) {
      this.from = stage;
      this.target = stage;
      return;
    }
    if (stage === this.target) return;
    const layers = this.sample(now);
    layers.sort((a, b) => b.opacity - a.opacity);
    this.from = layers[0].stage;
    this.target = stage;
    this.startedAt = now;
  }

  sample(now: number): GrowthLayerState[] {
    const elapsed = Math.max(0, (now - this.startedAt) / GROWTH_MOTION.transitionSeconds);
    if (this.from === this.target || elapsed >= 1)
      return [{ stage: this.target, opacity: 1, scale: 1 }];
    const eased = elapsed * elapsed * (3 - 2 * elapsed);
    return [
      {
        stage: this.from,
        opacity: 1 - eased,
        scale: 1 - GROWTH_MOTION.outgoingScaleChange * eased,
      },
      {
        stage: this.target,
        opacity: eased,
        scale: GROWTH_MOTION.incomingScale + (1 - GROWTH_MOTION.incomingScale) * eased,
      },
    ];
  }
}
