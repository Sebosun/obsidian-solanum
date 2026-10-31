/** Progress through a session (0 to 1) at which the plant reaches each growth stage. */
const STAGE_STARTS = { sprout: 0.2, young: 0.4, grown: 0.65 } as const;

export function cropStage(progress: number): number {
  if (progress >= 1) return 4;
  if (progress >= STAGE_STARTS.grown) return 3;
  if (progress >= STAGE_STARTS.young) return 2;
  if (progress >= STAGE_STARTS.sprout) return 1;
  return 0;
}
