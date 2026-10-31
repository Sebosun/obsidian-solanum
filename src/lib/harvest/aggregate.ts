import { intervalEnd } from "@/lib/timer/selectors";
import { MS_PER_MINUTE, startOfDay, startOfNextDay } from "@/lib/time";
import type { Revision } from "@/lib/timer/types";

/** A day's crops grow by its focused time: one per this many minutes, up to the cap. */
const MINUTES_PER_DAY_CROP = 25;
const MAX_DAY_CROPS = 9;

export interface HarvestFilter {
  tag?: string;
  notePath?: string;
}

export function monthDays(year: number, month: number): Date[] {
  return Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, i) => new Date(year, month, i + 1),
  );
}

export function dailyHarvest(
  sessions: Revision[],
  day: Date,
  filter: HarvestFilter = {},
  now = Date.now(),
) {
  const start = startOfDay(day).getTime();
  const end = startOfNextDay(day).getTime();
  const entries = sessions
    // A crop stopped before it finished never matured, so it earns nothing.
    .filter((s) => s.status !== "cancelled")
    .filter(
      (s) =>
        (!filter.tag || s.tags.includes(filter.tag)) &&
        (!filter.notePath || s.notePath === filter.notePath),
    )
    .map((session) => {
      const ms = session.intervals.reduce((total, interval) => {
        const until = intervalEnd(interval, session, now);
        return total + Math.max(0, Math.min(end, until) - Math.max(start, interval.start));
      }, 0);
      return { session, minutes: ms / MS_PER_MINUTE };
    })
    .filter((entry) => entry.minutes > 0);
  const minutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  return {
    minutes,
    crops: minutes ? Math.min(MAX_DAY_CROPS, Math.ceil(minutes / MINUTES_PER_DAY_CROP)) : 0,
    entries,
  };
}
