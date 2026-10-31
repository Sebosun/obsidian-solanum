import type { HarvestDay } from "@/lib/harvest/model";

const DAYS_PER_WEEK = 7;
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -DAYS_PER_WEEK,
  ArrowDown: DAYS_PER_WEEK,
};

/** The day an arrow key moves to, or null when the key does not navigate the month. */
export function adjacentDayKey(
  days: HarvestDay[],
  selectedKey: string | null,
  arrow: string,
): string | null {
  const step = KEY_STEPS[arrow];
  if (step === undefined || days.length === 0) return null;
  const current = days.findIndex((day) => day.key === selectedKey);
  if (current < 0) return days[0].key;
  const target = Math.min(days.length - 1, Math.max(0, current + step));
  return days[target].key;
}
