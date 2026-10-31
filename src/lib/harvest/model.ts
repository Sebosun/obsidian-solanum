import { dailyHarvest, monthDays, type HarvestFilter } from "@/lib/harvest/aggregate";
import type { Revision } from "@/lib/timer/types";
import { HARVEST_GRID } from "@/lib/scene/constants";

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export interface HarvestItem {
  key: string;
  session: Revision;
  progress: number;
  position: [number, number, number];
}

export interface HarvestDay {
  key: string;
  date: Date;
  column: number;
  row: number;
  position: [number, number, number];
  minutes: number;
  entries: ReturnType<typeof dailyHarvest>["entries"];
  items: HarvestItem[];
  overflow: number;
}

export function buildHarvestMonth(
  sessions: Revision[],
  month: Date,
  filter: HarvestFilter = {},
  now = Date.now(),
): HarvestDay[] {
  const dates = monthDays(month.getFullYear(), month.getMonth());
  const offset = dates[0].getDay();
  const rows = Math.ceil((offset + dates.length) / 7);
  return dates.map((date, index) => {
    const harvest = dailyHarvest(sessions, date, filter, now);
    const column = (offset + index) % 7;
    const row = Math.floor((offset + index) / 7);
    // One visible crop-equivalent per 25 focused minutes, minimum one per contributing session.
    // Round robin preserves crop diversity before adding extra units for longer work.
    const entries = [...harvest.entries].sort((a, b) => a.session.startedAt - b.session.startedAt);
    const units = entries.map((e) => Math.max(1, Math.ceil(e.minutes / 25)));
    const count = units.reduce((sum, n) => sum + n, 0);
    const items: HarvestItem[] = [];
    const visibleLimit = Math.min(HARVEST_GRID.maxCropsPerPlot, count);
    for (let unit = 0; items.length < visibleLimit; unit++) {
      for (let i = 0; i < entries.length && items.length < visibleLimit; i++) {
        if (unit >= units[i]) continue;
        const s = entries[i].session;
        const focused = s.intervals.reduce(
          (sum, interval) =>
            sum + Math.max(0, (interval.end ?? Math.min(now, s.deadline ?? now)) - interval.start),
          0,
        );
        items.push({
          key: `${s.sessionId}-${unit}`,
          session: s,
          progress: s.focusEndedAt !== null ? 1 : Math.min(0.99, focused / s.durationMs),
          position: [
            ((items.length % 3) - 1) * HARVEST_GRID.cropSpacing,
            HARVEST_GRID.cropBaseHeight,
            (Math.floor(items.length / 3) - 1) * HARVEST_GRID.cropSpacing,
          ],
        });
      }
    }
    return {
      key: dayKey(date),
      date,
      column,
      row,
      position: [
        (column - (HARVEST_GRID.columns - 1) / 2) * HARVEST_GRID.cellSpacing,
        0,
        (row - (rows - 1) / 2) * HARVEST_GRID.cellSpacing,
      ],
      minutes: harvest.minutes,
      entries,
      items,
      overflow: Math.max(0, count - items.length),
    };
  });
}
