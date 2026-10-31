import type { FocusInterval, Phase, Revision, Status } from "@/lib/timer/types";
import { isCropId } from "@/lib/crops/catalog";
import { isFiniteNumber, isOneOf, isRecord } from "@/lib/guards";

const SAFE_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const safeId = (v: unknown): v is string => typeof v === "string" && SAFE_ID.test(v);

const PHASES: readonly Phase[] = ["focus", "break", "done"];
const STATUSES: readonly Status[] = ["running", "paused", "waiting", "completed", "cancelled"];
const SOURCES: readonly string[] = ["debug", "seed"];
const ENDED_STATUSES: readonly Status[] = ["completed", "cancelled"];
const FOCUS_STATUSES: readonly Status[] = ["running", "paused"];
const BREAK_STATUSES: readonly Status[] = ["running", "paused", "waiting"];

/** Whether a phase and status can go together, given whether focus has ended. */
function isLifecycle(phase: Phase, status: Status, focusEnded: boolean): boolean {
  if (phase === "done") return isOneOf(ENDED_STATUSES, status);
  if (phase === "focus") return isOneOf(FOCUS_STATUSES, status) && !focusEnded;
  return isOneOf(BREAK_STATUSES, status) && focusEnded;
}

/** The intervals in order, each starting after the one before ended; only a running focus is open. */
function readIntervals(
  value: unknown,
  startedAt: number,
  openAllowed: boolean,
): FocusInterval[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const intervals: FocusInterval[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isFiniteNumber(item.start) || item.start < startedAt) return null;
    const previous = intervals[intervals.length - 1];
    if (previous && (previous.end === null || previous.end > item.start)) return null;
    if (item.end === null) {
      if (!openAllowed || intervals.length !== value.length - 1) return null;
      intervals.push({ start: item.start, end: null });
    } else if (isFiniteNumber(item.end) && item.end >= item.start) {
      intervals.push({ start: item.start, end: item.end });
    } else return null;
  }
  return intervals;
}

export function isRevision(value: unknown): value is Revision {
  if (!isRecord(value)) return false;
  const { phase, status, deadline, focusEndedAt, startedAt, parents, tags } = value;
  if (value.schema !== 1 || !safeId(value.id) || !safeId(value.sessionId)) return false;
  if (!Array.isArray(parents) || !parents.every(safeId) || parents.includes(value.id)) return false;
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(value.updatedAt)) return false;
  if (!isFiniteNumber(value.durationMs) || value.durationMs <= 0) return false;
  if (!isFiniteNumber(value.breakMs) || value.breakMs <= 0) return false;
  if (typeof value.autoBreak !== "boolean" || !isCropId(value.crop)) return false;
  if (value.source !== undefined && !isOneOf(SOURCES, value.source)) return false;
  if (!isOneOf(PHASES, phase) || !isOneOf(STATUSES, status)) return false;
  if (deadline !== null && !isFiniteNumber(deadline)) return false;
  if (focusEndedAt !== null && !isFiniteNumber(focusEndedAt)) return false;
  if (!isFiniteNumber(value.remainingMs) || value.remainingMs < 0) return false;
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) return false;
  if (value.notePath !== null && typeof value.notePath !== "string") return false;
  const running = status === "running";
  const intervals = readIntervals(value.intervals, startedAt, phase === "focus" && running);
  if (!intervals) return false;
  // Only a running timer has a deadline, and only a running focus has an interval left open.
  if (running !== (deadline !== null)) return false;
  if (!isLifecycle(phase, status, focusEndedAt !== null)) return false;
  const openInterval = intervals[intervals.length - 1].end === null;
  return phase !== "focus" || !running || openInterval;
}
