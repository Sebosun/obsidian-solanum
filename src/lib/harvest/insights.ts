import { dailyHarvest, monthDays, type HarvestFilter } from "@/lib/harvest/aggregate";
import { summarizeMonths, type MonthSummary } from "@/lib/harvest/month";
import { intervalEnd } from "@/lib/timer/selectors";
import type { Revision } from "@/lib/timer/types";
import { MS_PER_MINUTE } from "@/lib/time";

export interface FocusAmount {
  name: string;
  minutes: number;
}

export interface DailyFocus {
  date: Date;
  minutes: number;
}

export interface MonthInsights {
  days: DailyFocus[];
  weekdays: FocusAmount[];
  periods: FocusAmount[];
  tags: FocusAmount[];
  notes: FocusAmount[];
  previous: MonthSummary;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
/** Local clock hours; calendar boundaries also account for daylight-saving changes. */
const DAY_PERIODS = [
  { name: "Night · 00–06", startHour: 0, endHour: 6 },
  { name: "Morning · 06–12", startHour: 6, endHour: 12 },
  { name: "Afternoon · 12–18", startHour: 12, endHour: 18 },
  { name: "Evening · 18–24", startHour: 18, endHour: 24 },
];

function ranked(amounts: Map<string, number>): FocusAmount[] {
  return [...amounts]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}

/** Uses credited focus intervals, never the session's planned duration or its start hour alone. */
export function monthInsights(
  sessions: Revision[],
  month: Date,
  filter: HarvestFilter = {},
  now = Date.now(),
): MonthInsights {
  const weekdays = WEEKDAYS.map((name) => ({ name, minutes: 0 }));
  const periods = DAY_PERIODS.map(({ name }) => ({ name, minutes: 0 }));
  const tags = new Map<string, number>();
  const notes = new Map<string, number>();
  const days = monthDays(month.getFullYear(), month.getMonth()).map((date) => {
    const daily = dailyHarvest(sessions, date, filter, now);
    weekdays[(date.getDay() + 6) % 7].minutes += daily.minutes;
    for (const { session, minutes } of daily.entries) {
      const sessionTags = session.tags.length ? new Set(session.tags) : ["Untagged"];
      for (const tag of sessionTags) tags.set(tag, (tags.get(tag) ?? 0) + minutes);
      const note = session.notePath || "No linked note";
      notes.set(note, (notes.get(note) ?? 0) + minutes);
      DAY_PERIODS.forEach((period, index) => {
        const start = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          period.startHour,
        ).getTime();
        const end = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          period.endHour,
        ).getTime();
        for (const interval of session.intervals) {
          periods[index].minutes +=
            Math.max(
              0,
              Math.min(end, intervalEnd(interval, session, now)) - Math.max(start, interval.start),
            ) / MS_PER_MINUTE;
        }
      });
    }
    return { date, minutes: daily.minutes };
  });
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  return {
    days,
    weekdays,
    periods,
    tags: ranked(tags),
    notes: ranked(notes),
    previous: summarizeMonths(sessions, [previousMonth], filter, now),
  };
}
