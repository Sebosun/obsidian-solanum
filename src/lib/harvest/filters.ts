import type { Revision } from "@/lib/timer/types";

export interface HarvestFilterOptions {
  tags: string[];
  notes: string[];
}

/**
 * The tags and notes worth filtering the harvest by: only those a finished crop uses.
 * Stopped crops never show in the harvest, so a tag only they used would filter to nothing.
 */
export function harvestFilterOptions(sessions: Revision[]): HarvestFilterOptions {
  const counted = sessions.filter((session) => session.status !== "cancelled");
  const tags = new Set(counted.flatMap((session) => session.tags));
  const notes = new Set(counted.flatMap((session) => (session.notePath ? [session.notePath] : [])));
  return { tags: [...tags].sort(), notes: [...notes].sort() };
}
