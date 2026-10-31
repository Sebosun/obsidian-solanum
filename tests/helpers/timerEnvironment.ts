import { TimerService } from "@/lib/timer/TimerService";
import type { TimerEnvironment } from "@/lib/timer/types";

/** The real clock with a fixed or numbered id, for tests whose timing does not matter. */
export function wallClock(id: () => string = () => "unused"): TimerEnvironment {
  return { now: Date.now, id };
}

/** Ids `prefix-1`, `prefix-2`, ... */
export function numberedIds(prefix: string): () => string {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

/** A timer over an empty store that keeps nothing, for scenes that only need a host. */
export function emptyTimer(): TimerService {
  return new TimerService({ readAll: async () => [], append: async () => {} }, wallClock());
}
