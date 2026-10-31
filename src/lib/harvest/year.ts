import { dailyHarvest, monthDays, type HarvestFilter } from "@/lib/harvest/aggregate";
import { dayKey } from "@/lib/harvest/model";
import type { Revision } from "@/lib/timer/types";

export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

/** Focused minutes per day at which a day reaches heat levels 1 to 4. */
const LEVEL_THRESHOLD_MINUTES = [1, 30, 60, 120] as const;

export function intensityLevel(minutes: number): IntensityLevel {
  let level: IntensityLevel = 0;
  LEVEL_THRESHOLD_MINUTES.forEach((threshold, index) => {
    if (minutes >= threshold) level = (index + 1) as IntensityLevel;
  });
  return level;
}

export interface YearDay {
  key: string;
  date: Date;
  minutes: number;
  level: IntensityLevel;
}

export interface YearMonth {
  /** Zero-based month number. */
  index: number;
  date: Date;
  /** Weekday column (Sunday = 0) of the first day. */
  offset: number;
  days: YearDay[];
  minutes: number;
}

const MONTHS_PER_YEAR = 12;

export function buildHarvestYear(
  sessions: Revision[],
  year: number,
  filter: HarvestFilter = {},
  now = Date.now(),
): YearMonth[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, index) => {
    const dates = monthDays(year, index);
    const days = dates.map((date) => {
      const { minutes } = dailyHarvest(sessions, date, filter, now);
      return { key: dayKey(date), date, minutes, level: intensityLevel(minutes) };
    });
    return {
      index,
      date: dates[0],
      offset: dates[0].getDay(),
      days,
      minutes: days.reduce((sum, day) => sum + day.minutes, 0),
    };
  });
}
