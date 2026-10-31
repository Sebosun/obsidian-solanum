import type { HarvestBlocks } from "@/lib/harvest/month";

/**
 * Whether a month has no harvest to show. A harvest is a session that focused for some time in the
 * month, so this is also exactly when the month's focused minutes are zero; every view decides
 * "empty" from this one definition.
 */
export function isEmptyMonth(layout: Pick<HarvestBlocks, "total">): boolean {
  return layout.total === 0;
}
