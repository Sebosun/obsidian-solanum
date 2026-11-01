import type { HarvestFilter } from "@/lib/harvest/aggregate";
import { summarizeMonth, summarizeMonths, type MonthSummary } from "@/lib/harvest/month";
import { CROP_IDS, type CropId } from "@/lib/crops/catalog";
import { MONTHS_PER_YEAR, YEAR_STACKS } from "@/lib/scene/constants";
import type { Revision } from "@/lib/timer/types";

export interface YearMonth extends MonthSummary {
  /** Zero-based month number. */
  index: number;
  date: Date;
}

export interface YearStack {
  index: number;
  minutes: number;
  /** Crates in the stack; 0 for a month with nothing finished, which gets one bare low crate. */
  crates: number;
  empty: boolean;
  /** True for the month with the most focused time. */
  busiest: boolean;
  /** The crops growing in the top crate, mixed. */
  plants: CropId[];
}

export interface YearStacks {
  /** Focused minutes one crate stands for, the same in every stack. */
  crateMinutes: number;
  stacks: YearStack[];
}

export function summarizeYear(
  sessions: Revision[],
  year: number,
  filter: HarvestFilter = {},
  now = Date.now(),
): YearMonth[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, index) => {
    const date = new Date(year, index, 1);
    return { index, date, ...summarizeMonth(sessions, date, filter, now) };
  });
}

export function summarizeYearTotal(
  sessions: Revision[],
  year: number,
  filter: HarvestFilter = {},
  now = Date.now(),
): MonthSummary {
  const months = Array.from({ length: MONTHS_PER_YEAR }, (_, index) => new Date(year, index, 1));
  return summarizeMonths(sessions, months, filter, now);
}

/** Splits `count` plants across crop types by their share, giving leftovers to the biggest remainders. */
function shareOut(count: number, crops: Record<CropId, number>): Record<CropId, number> {
  const total = CROP_IDS.reduce((sum, id) => sum + crops[id], 0);
  const shares = Object.fromEntries(CROP_IDS.map((id) => [id, 0])) as Record<CropId, number>;
  if (total === 0) return shares;
  const exact = CROP_IDS.map((id) => ({ id, value: (crops[id] / total) * count }));
  for (const { id, value } of exact) shares[id] = Math.floor(value);
  let left = count - CROP_IDS.reduce((sum, id) => sum + shares[id], 0);
  for (const { id } of [...exact].sort((a, b) => (b.value % 1) - (a.value % 1))) {
    if (left <= 0) break;
    shares[id] += 1;
    left -= 1;
  }
  return shares;
}

/** Hands plants out one crop type at a time, so the crate is mixed rather than in blocks. */
function mixedPlants(count: number, crops: Record<CropId, number>): CropId[] {
  const remaining = shareOut(count, crops);
  const order: CropId[] = [];
  while (order.length < count) {
    for (const id of CROP_IDS) {
      if (remaining[id] > 0 && order.length < count) {
        order.push(id);
        remaining[id] -= 1;
      }
    }
  }
  return order;
}

/**
 * One stack of crates per month. A crate stands for the same amount of time everywhere, chosen so
 * the busiest month fills the tallest stack; the top crate fills by how much of a crate is left over.
 */
export function layoutYearStacks(months: YearMonth[]): YearStacks {
  const busiestMinutes = Math.max(0, ...months.map((month) => month.minutes));
  const rounding = YEAR_STACKS.crateRoundingMinutes;
  const fitted = Math.ceil(busiestMinutes / YEAR_STACKS.maxCrates / rounding) * rounding;
  const crateMinutes = Math.max(YEAR_STACKS.minCrateMinutes, fitted);
  const busiestIndex =
    busiestMinutes > 0 ? months.findIndex((month) => month.minutes === busiestMinutes) : -1;
  const stacks = months.map((month): YearStack => {
    if (month.minutes <= 0)
      return { index: month.index, minutes: 0, crates: 0, empty: true, busiest: false, plants: [] };
    const crates = Math.ceil(month.minutes / crateMinutes);
    const topShare = (month.minutes - (crates - 1) * crateMinutes) / crateMinutes;
    const count = Math.min(
      YEAR_STACKS.topPlants,
      Math.max(YEAR_STACKS.minTopPlants, Math.round(topShare * YEAR_STACKS.topPlants)),
    );
    return {
      index: month.index,
      minutes: month.minutes,
      crates,
      empty: false,
      busiest: month.index === busiestIndex,
      plants: mixedPlants(count, month.crops),
    };
  });
  return { crateMinutes, stacks };
}
