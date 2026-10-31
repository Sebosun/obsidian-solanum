import { dayKey } from "@/lib/harvest/model";
import type { Revision } from "@/lib/timer/types";

const startOfDay = (at: number) => {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/** Every local day on which any of these sessions had focused time, oldest first. */
export function daysTouched(sessions: Revision[], now: number): Date[] {
  const days = new Map<string, Date>();
  for (const session of sessions) {
    for (const interval of session.intervals) {
      const until = interval.end ?? Math.min(now, session.deadline ?? now);
      const last = startOfDay(Math.max(interval.start, until));
      for (
        let day = startOfDay(interval.start);
        day.getTime() <= last.getTime();
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
      )
        days.set(dayKey(day), day);
    }
  }
  return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
}
