import { seedMonth } from "@/lib/debug/seeder";
import type { Revision } from "@/lib/timer/types";

const template = seedMonth(new Date(2026, 9, 1), new Date(2026, 10, 1).getTime())[0];

/** A finished focus session, built independently of the code under test. */
export function focusSession(
  id: string,
  start: Date,
  minutes: number,
  extra: Partial<Revision> = {},
): Revision {
  const from = start.getTime();
  const to = from + minutes * 60_000;
  return {
    ...template,
    id,
    sessionId: id,
    source: undefined,
    parents: [],
    tags: [],
    notePath: null,
    crop: "tomato",
    startedAt: from,
    updatedAt: to,
    durationMs: minutes * 60_000,
    breakMs: 5 * 60_000,
    phase: "done",
    status: "completed",
    deadline: null,
    remainingMs: 0,
    intervals: [{ start: from, end: to }],
    focusEndedAt: to,
    ...extra,
  };
}
