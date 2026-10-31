import { dailyHarvest, monthDays, type HarvestFilter } from "@/lib/harvest/aggregate";
import { CROPS, type CropId } from "@/lib/crops/catalog";
import { HARVEST_BLOCKS } from "@/lib/scene/constants";
import type { Revision } from "@/lib/timer/types";

export { HARVEST_BLOCKS as BLOCKS };

export interface HarvestBlock {
  key: string;
  sessionId: string;
  crop: CropId;
  /** Focused minutes this harvest contributed to the month. */
  minutes: number;
  startedAt: number;
  /** 1 for a harvested crop, less for one still growing. */
  progress: number;
  height: number;
  /** Centre of the block on the ground: [x, 0, z]. */
  position: [number, number, number];
}

export interface HarvestBlocks {
  blocks: HarvestBlock[];
  /** Harvests in the month, before any thinning. */
  total: number;
  columns: number;
  rows: number;
}

export interface MonthSummary {
  minutes: number;
  harvests: number;
  activeDays: number;
  crops: Record<CropId, number>;
  /** The most used tags, by number of harvests. */
  tags: { tag: string; count: number }[];
}

interface Credit {
  session: Revision;
  minutes: number;
  day: number;
}

const CROP_IDS = Object.keys(CROPS) as CropId[];

function monthCredits(
  sessions: Revision[],
  month: Date,
  filter: HarvestFilter,
  now: number,
): Credit[] {
  const credits: Credit[] = [];
  monthDays(month.getFullYear(), month.getMonth()).forEach((date, day) => {
    for (const { session, minutes } of dailyHarvest(sessions, date, filter, now).entries)
      credits.push({ session, minutes, day });
  });
  return credits;
}

function growthProgress(session: Revision, now: number): number {
  if (session.focusEndedAt !== null) return 1;
  const focused = session.intervals.reduce(
    (sum, interval) =>
      sum + Math.max(0, (interval.end ?? Math.min(now, session.deadline ?? now)) - interval.start),
    0,
  );
  return Math.min(0.99, focused / session.durationMs);
}

/** Taller for longer sessions, up to ninety minutes. */
export function blockHeight(minutes: number): number {
  const share = Math.min(Math.max(minutes, 0), HARVEST_BLOCKS.fullHeightMinutes);
  return (
    HARVEST_BLOCKS.minHeight +
    (share / HARVEST_BLOCKS.fullHeightMinutes) * HARVEST_BLOCKS.heightRange
  );
}

/** Keeps `limit` items spread evenly through the list, so thinning never favours one end. */
function thin<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  return Array.from({ length: limit }, (_, i) => items[Math.floor((i * items.length) / limit)]);
}

export function layoutHarvestBlocks(
  sessions: Revision[],
  month: Date,
  filter: HarvestFilter = {},
  now = Date.now(),
): HarvestBlocks {
  const bySession = new Map<string, { session: Revision; minutes: number }>();
  for (const { session, minutes } of monthCredits(sessions, month, filter, now)) {
    const entry = bySession.get(session.sessionId) ?? { session, minutes: 0 };
    entry.minutes += minutes;
    bySession.set(session.sessionId, entry);
  }
  const ordered = [...bySession.values()].sort(
    (a, b) => a.session.startedAt - b.session.startedAt || a.session.id.localeCompare(b.session.id),
  );
  const kept = thin(ordered, HARVEST_BLOCKS.maxBlocks);
  const columns = Math.min(
    HARVEST_BLOCKS.maxColumns,
    Math.max(
      HARVEST_BLOCKS.minColumns,
      Math.ceil(Math.sqrt(kept.length * HARVEST_BLOCKS.columnSpread)),
    ),
  );
  const rows = Math.ceil(kept.length / columns);
  const blocks = kept.map(({ session, minutes }, index): HarvestBlock => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      key: session.sessionId,
      sessionId: session.sessionId,
      crop: session.crop,
      minutes,
      startedAt: session.startedAt,
      progress: growthProgress(session, now),
      height: blockHeight(minutes),
      position: [
        (column - (columns - 1) / 2) * HARVEST_BLOCKS.pitch,
        0,
        (row - (rows - 1) / 2) * HARVEST_BLOCKS.pitch,
      ],
    };
  });
  return { blocks, total: ordered.length, columns, rows };
}

export function summarizeMonth(
  sessions: Revision[],
  month: Date,
  filter: HarvestFilter = {},
  now = Date.now(),
): MonthSummary {
  const credits = monthCredits(sessions, month, filter, now);
  const crops = Object.fromEntries(CROP_IDS.map((id) => [id, 0])) as Record<CropId, number>;
  const seen = new Set<string>();
  const tagCounts = new Map<string, number>();
  const activeDays = new Set<number>();
  let minutes = 0;
  for (const credit of credits) {
    minutes += credit.minutes;
    activeDays.add(credit.day);
    if (seen.has(credit.session.sessionId)) continue;
    seen.add(credit.session.sessionId);
    crops[credit.session.crop] += 1;
    for (const tag of credit.session.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, HARVEST_BLOCKS.maxTags);
  return { minutes, harvests: seen.size, activeDays: activeDays.size, crops, tags };
}
