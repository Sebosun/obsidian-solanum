export function cropStage(progress: number): number {
  if (progress >= 1) return 4;
  if (progress >= 0.65) return 3;
  if (progress >= 0.4) return 2;
  if (progress >= 0.2) return 1;
  return 0;
}
