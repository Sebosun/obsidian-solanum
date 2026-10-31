import type { Revision } from "@/lib/timer/types";
import { CROPS, type CropId } from "@/lib/crops/catalog";

const SEED_FOCUS_MINUTES = [25, 50, 10, 60] as const;
const SEED_WORK_TAGS = ["work/client", "study", "writing"] as const;
const SEED_SESSION_VARIATION = 4;
const SEED_FIRST_SESSION_HOUR = 9;
const SEED_SESSION_SPACING_HOURS = 2;
const SEED_BREAK_MINUTES = 5;
const MILLISECONDS_PER_MINUTE = 60_000;

/** Stable IDs make repeated seeding additive/idempotent, never destructive. */
export function seedMonth(month: Date, now: number, notes: string[] = []): Revision[] {
  const sessions: Revision[] = [];
  const year = month.getFullYear();
  const index = month.getMonth();
  const crops = Object.keys(CROPS) as CropId[];
  const days = new Date(year, index + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    for (let slot = 0; slot < day % SEED_SESSION_VARIATION; slot++) {
      const hour = SEED_FIRST_SESSION_HOUR + slot * SEED_SESSION_SPACING_HOURS;
      const start = new Date(year, index, day, hour).getTime();
      const durationMs =
        SEED_FOCUS_MINUTES[(day + slot) % SEED_FOCUS_MINUTES.length] * MILLISECONDS_PER_MINUTE;
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
        breakMs: SEED_BREAK_MINUTES * MILLISECONDS_PER_MINUTE,
        autoBreak: false,
        phase: "done",
        status: "completed",
        deadline: null,
        remainingMs: 0,
        focusEndedAt: end,
        intervals: [{ start, end }],
        tags: ["demo", SEED_WORK_TAGS[(day + slot) % SEED_WORK_TAGS.length]],
        notePath: notes.length ? notes[(day + slot) % notes.length] : null,
        crop: crops[(day + slot) % crops.length],
      });
    }
  }
  return sessions;
}
