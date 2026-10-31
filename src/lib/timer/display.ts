import type { CropId } from "@/lib/crops/catalog";
import type { Revision } from "@/lib/timer/types";
import { MS_PER_MINUTE, MS_PER_SECOND } from "@/lib/time";

/** What the timer's scene and clock show, worked out from the session (or the draft, before one). */
export interface TimerDisplay {
  /** Milliseconds left in the running phase, or the draft's whole duration before a session. */
  remaining: number;
  crop: CropId;
  /** How grown the crop is, 0 to 1: full once the focus is over. */
  progress: number;
  /** How far through the phase the sun is, 0 to 1. */
  clockProgress: number;
  /** How fast the sun advances, per second: 0 unless the phase is running. */
  clockRate: number;
  /** The break is under way, so the cat takes over from the crop. */
  resting: boolean;
}

export interface TimerDraft {
  minutes: number;
  crop: CropId;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The timer's picture of `session` with `remaining` milliseconds left in its phase, or of the
 * `draft` when there is no session. The sun crosses the sky once per phase: the focus, then the
 * break once it has started, and rests at dawn while the break waits.
 */
export function timerDisplay(
  session: Revision | undefined,
  remaining: number,
  draft: TimerDraft,
): TimerDisplay {
  if (!session) {
    return {
      remaining: draft.minutes * MS_PER_MINUTE,
      crop: draft.crop,
      progress: 0,
      clockProgress: 0,
      clockRate: 0,
      resting: false,
    };
  }
  const inFocus = session.phase === "focus";
  const resting = session.phase === "break" && session.status !== "waiting";
  const progress = inFocus ? 1 - remaining / session.durationMs : 1;
  let clockProgress = 0;
  if (inFocus) clockProgress = progress;
  else if (resting) clockProgress = 1 - remaining / session.breakMs;
  let clockRate = 0;
  if (session.status === "running" && session.phase !== "done") {
    clockRate = MS_PER_SECOND / (inFocus ? session.durationMs : session.breakMs);
  }
  return {
    remaining,
    crop: session.crop,
    progress: clamp01(progress),
    clockProgress: clamp01(clockProgress),
    clockRate,
    resting,
  };
}
