import type { Revision } from "./types";

/** Apply the same phase transition for natural expiry and explicit debug completion. */
export function completePhase(session: Revision, at: number): void {
  if (session.phase === "focus") {
    const interval = session.intervals[session.intervals.length - 1];
    if (interval.end === null) interval.end = at;
    session.focusEndedAt = at;
    session.phase = "break";
    session.status = session.autoBreak ? "running" : "waiting";
    session.remainingMs = session.breakMs;
    session.deadline = session.autoBreak ? at + session.breakMs : null;
    return;
  }
  session.phase = "done";
  session.status = "completed";
  session.remainingMs = 0;
  session.deadline = null;
}
