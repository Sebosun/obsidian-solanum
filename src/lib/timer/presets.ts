import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES } from "@/lib/timer/limits";

export const DEFAULT_PRESETS: readonly number[] = [5, 10, 25, 50, 60, 90, 120];
export const MIN_PRESET_MINUTES = MIN_DURATION_MINUTES;
export const MAX_PRESET_MINUTES = MAX_DURATION_MINUTES;
export const MAX_PRESETS = 8;

export type PresetsResult = { ok: true; presets: number[] } | { ok: false; reason: string };

/** Reads "5, 10 25" style input into sorted, unique minutes. */
export function parsePresets(input: string): PresetsResult {
  const words = input.split(/[\s,]+/).filter((word) => word !== "");
  if (words.length === 0) return { ok: false, reason: "Enter at least one duration." };
  if (!words.every((word) => /^\d+$/.test(word)))
    return { ok: false, reason: "Use whole numbers of minutes, separated by commas." };
  const minutes = words.map(Number);
  if (minutes.some((value) => value < MIN_PRESET_MINUTES || value > MAX_PRESET_MINUTES))
    return {
      ok: false,
      reason: `Each duration must be between ${MIN_PRESET_MINUTES} and ${MAX_PRESET_MINUTES} minutes.`,
    };
  const presets = [...new Set(minutes)].sort((a, b) => a - b);
  if (presets.length > MAX_PRESETS)
    return { ok: false, reason: `Use at most ${MAX_PRESETS} presets.` };
  return { ok: true, presets };
}

/** The saved default if it is still offered, otherwise the nearest preset (the shorter on a tie). */
export function effectiveDefaultMinutes(presets: readonly number[], saved: number): number {
  if (presets.includes(saved)) return saved;
  return presets.reduce((best, value) =>
    Math.abs(value - saved) < Math.abs(best - saved) ? value : best,
  );
}

/** Stored presets, or the defaults when the value is not a usable list. */
export function readPresets(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_PRESETS];
  const parsed = parsePresets(value.map(String).join(" "));
  return parsed.ok ? parsed.presets : [...DEFAULT_PRESETS];
}
