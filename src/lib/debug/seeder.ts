import type { Revision } from "@/lib/timer/types";
import { CROPS, type CropId } from "@/lib/crops/catalog";

/** Stable IDs make repeated seeding additive/idempotent, never destructive. */
export function seedMonth(month: Date, now: number, notes: string[] = []): Revision[] {
  const sessions: Revision[] = [];
  const year = month.getFullYear();
  const index = month.getMonth();
  const crops = Object.keys(CROPS) as CropId[];
  const days = new Date(year, index + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    for (let slot = 0; slot < day % 4; slot++) {
      const start = new Date(year, index, day, 9 + slot * 2).getTime();
      const durationMs = [25, 50, 10, 60][(day + slot) % 4] * 60_000;
      const end = start + durationMs;
      if (end > now) continue;
      const id = `seed-v1-${year}-${index + 1}-${day}-${slot}`;
      sessions.push({
        schema: 1,
        id,
        sessionId: id,
        parents: [],
        source: "seed",
        startedAt: start,
        updatedAt: end,
        durationMs,
        breakMs: 5 * 60_000,
        autoBreak: false,
        phase: "done",
        status: "completed",
        deadline: null,
        remainingMs: 0,
        focusEndedAt: end,
        intervals: [{ start, end }],
        tags: ["demo", ["work/client", "study", "writing"][(day + slot) % 3]],
        notePath: notes.length ? notes[(day + slot) % notes.length] : null,
        crop: crops[(day + slot) % crops.length],
      });
    }
  }
  return sessions;
}
