import type { Revision } from "../timer/types";
import { isCropId } from "../crops/catalog";

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const safeId = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(v);

export function isRevision(value: unknown): value is Revision {
  if (!value || typeof value !== "object") return false;
  const r = value as Revision;
  return (
    r.schema === 1 &&
    safeId(r.id) &&
    safeId(r.sessionId) &&
    Array.isArray(r.parents) &&
    r.parents.every(safeId) &&
    !r.parents.includes(r.id) &&
    finite(r.startedAt) &&
    finite(r.updatedAt) &&
    finite(r.durationMs) &&
    r.durationMs > 0 &&
    finite(r.breakMs) &&
    r.breakMs > 0 &&
    typeof r.autoBreak === "boolean" &&
    isCropId(r.crop) &&
    (r.source === undefined || ["debug", "seed"].includes(r.source)) &&
    ["focus", "break", "done"].includes(r.phase) &&
    ["running", "paused", "waiting", "completed", "cancelled"].includes(r.status) &&
    (r.deadline === null || finite(r.deadline)) &&
    (r.focusEndedAt === null || finite(r.focusEndedAt)) &&
    finite(r.remainingMs) &&
    r.remainingMs >= 0 &&
    Array.isArray(r.tags) &&
    r.tags.every((t) => typeof t === "string") &&
    (r.notePath === null || typeof r.notePath === "string") &&
    Array.isArray(r.intervals) &&
    r.intervals.length > 0 &&
    r.intervals.every(
      (i, index) =>
        i &&
        finite(i.start) &&
        i.start >= r.startedAt &&
        (i.end === null
          ? index === r.intervals.length - 1 && r.phase === "focus" && r.status === "running"
          : finite(i.end) && i.end >= i.start) &&
        (index === 0 ||
          (r.intervals[index - 1].end !== null && r.intervals[index - 1].end! <= i.start)),
    ) &&
    (r.status === "running" ? r.deadline !== null : r.deadline === null) &&
    (r.phase === "done"
      ? ["completed", "cancelled"].includes(r.status)
      : r.phase === "focus"
        ? ["running", "paused"].includes(r.status) && r.focusEndedAt === null
        : ["running", "paused", "waiting"].includes(r.status) && r.focusEndedAt !== null) &&
    (r.phase !== "focus" ||
      r.status !== "running" ||
      r.intervals[r.intervals.length - 1].end === null)
  );
}
