/** A short C-major chime. Frequencies are in Hz; envelope timings are seconds. */
export const COMPLETION_CHIME = {
  frequenciesHz: [523.25, 659.25, 783.99],
  noteSpacingSeconds: 0.16,
  attackSeconds: 0.02,
  releaseSeconds: 0.65,
  noteDurationSeconds: 0.7,
  peakGain: 0.25,
  silentGain: 0.0001,
} as const;
