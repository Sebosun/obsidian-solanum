import type { Revision } from "@/lib/timer/types";

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
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  // Construct local midnight rather than adding 24 hours: DST days can be shorter or longer.
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
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
        const until = interval.end ?? Math.min(now, session.deadline ?? now);
        return total + Math.max(0, Math.min(end, until) - Math.max(start, interval.start));
      }, 0);
      return { session, minutes: ms / 60_000 };
    })
    .filter((entry) => entry.minutes > 0);
  const minutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  return { minutes, crops: minutes ? Math.min(9, Math.ceil(minutes / 25)) : 0, entries };
}
