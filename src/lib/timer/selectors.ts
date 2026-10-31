import type { Revision, TimerState } from "@/lib/timer/types";

export const isActive = (s: Revision) => s.phase !== "done";
export const normalizeTags = (tags: string[]) => [
  ...new Set(tags.map((t) => t.trim().replace(/^#+/, "")).filter(Boolean)),
];

export function selectState(revisions: Revision[]): TimerState {
  const parents = new Set(revisions.flatMap((r) => r.parents));
  const groups = new Map<string, Revision[]>();
  for (const r of revisions) {
    if (parents.has(r.id)) continue;
    const group = groups.get(r.sessionId) ?? [];
    group.push(r);
    groups.set(r.sessionId, group);
  }
  const sessions: Revision[] = [];
  const conflicts: TimerState["conflicts"] = [];
  for (const [sessionId, versions] of groups) {
    versions.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
    sessions.push(versions[0]);
    if (versions.length > 1) conflicts.push({ sessionId, versions });
  }
  return { sessions: sessions.sort((a, b) => b.startedAt - a.startedAt), conflicts };
}
