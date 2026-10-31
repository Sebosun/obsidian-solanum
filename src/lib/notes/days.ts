import { dayKey } from "@/lib/harvest/model";
import { startOfDay, startOfNextDay } from "@/lib/time";
import { intervalEnd } from "@/lib/timer/selectors";
import type { Revision } from "@/lib/timer/types";

/** Every local day on which any of these sessions had focused time, oldest first. */
export function daysTouched(sessions: Revision[], now: number): Date[] {
  const days = new Map<string, Date>();
  for (const session of sessions) {
    for (const interval of session.intervals) {
      const until = intervalEnd(interval, session, now);
      const last = startOfDay(Math.max(interval.start, until));
      for (
        let day = startOfDay(interval.start);
        day.getTime() <= last.getTime();
        day = startOfNextDay(day)
      )
        days.set(dayKey(day), day);
    }
  }
  return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
}
