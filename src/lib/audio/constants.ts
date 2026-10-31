/** A gentle rising C-major arpeggio that rings out. Frequencies are in Hz; timings are seconds. */
export const COMPLETION_CHIME = {
  frequenciesHz: [523.25, 659.25, 783.99, 1046.5],
  noteSpacingSeconds: 0.2,
  attackSeconds: 0.02,
  releaseSeconds: 1.8,
  noteDurationSeconds: 1.9,
  peakGain: 0.25,
  silentGain: 0.0001,
} as const;

/** Custom completion sounds: bigger files are refused, longer ones are cut short. */
export const MAX_CLIP_BYTES = 8 * 1024 * 1024;
export const MAX_CLIP_SECONDS = 20;
