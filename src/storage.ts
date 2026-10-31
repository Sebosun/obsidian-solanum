import type { Revision, SessionStore } from "./timer";
import { isCropId } from "./lib/crops/catalog";

export const SESSION_FOLDER = "Solanum/sessions";
export const DEBUG_SESSION_FOLDER = "Solanum/debug-sessions";

export interface FileAdapter {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<unknown>;
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
  read(path: string): Promise<string>;
  write(path: string, contents: string): Promise<unknown>;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const safeId = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(v);

export function isRevision(value: unknown): value is Revision {
  if (!value || typeof value !== "object") return false;
  const r = value as Revision;
  return r.schema === 1 && safeId(r.id) && safeId(r.sessionId)
    && Array.isArray(r.parents) && r.parents.every(safeId) && !r.parents.includes(r.id)
    && finite(r.startedAt) && finite(r.updatedAt)
    && finite(r.durationMs) && r.durationMs > 0 && finite(r.breakMs) && r.breakMs > 0
    && typeof r.autoBreak === "boolean" && isCropId(r.crop)
    && (r.source === undefined || ["debug", "seed"].includes(r.source))
    && ["focus", "break", "done"].includes(r.phase)
    && ["running", "paused", "waiting", "completed", "cancelled"].includes(r.status)
    && (r.deadline === null || finite(r.deadline))
    && (r.focusEndedAt === null || finite(r.focusEndedAt))
    && finite(r.remainingMs) && r.remainingMs >= 0
    && Array.isArray(r.tags) && r.tags.every((t) => typeof t === "string")
    && (r.notePath === null || typeof r.notePath === "string")
    && Array.isArray(r.intervals) && r.intervals.length > 0
    && r.intervals.every((i, index) => i && finite(i.start) && i.start >= r.startedAt
      && (i.end === null ? index === r.intervals.length - 1 && r.phase === "focus" && r.status === "running" : finite(i.end) && i.end >= i.start)
      && (index === 0 || (r.intervals[index - 1].end !== null && r.intervals[index - 1].end! <= i.start)))
    && (r.status === "running" ? r.deadline !== null : r.deadline === null)
    && (r.phase === "done" ? ["completed", "cancelled"].includes(r.status)
      : r.phase === "focus" ? ["running", "paused"].includes(r.status) && r.focusEndedAt === null
      : ["running", "paused", "waiting"].includes(r.status) && r.focusEndedAt !== null)
    && (r.phase !== "focus" || r.status !== "running" || r.intervals[r.intervals.length - 1].end === null);
}

/** Flat, immutable revision files sync without overwriting another device's edits. */
export class VaultSessionStore implements SessionStore {
  constructor(private adapter: FileAdapter, private options: { debug?: boolean } = {}) {}

  async readAll(): Promise<Revision[]> {
    const revisions: Revision[] = [];
    const folders = this.options.debug ? [SESSION_FOLDER, DEBUG_SESSION_FOLDER] : [SESSION_FOLDER];
    for (const folder of folders) {
    if (!await this.adapter.exists(folder)) continue;
    const { files } = await this.adapter.list(folder);
    for (const path of files.filter((p) => p.endsWith(".json"))) {
      let value: unknown;
      try { value = JSON.parse(await this.adapter.read(path)); }
      catch { throw new Error(`Cannot read session file ${path}. Sync may still be in progress; retry shortly.`); }
      if (!isRevision(value)) throw new Error(`Invalid or unsupported session schema in ${path}. File preserved; no changes made.`);
      revisions.push(value);
    }
    }
    return revisions;
  }

  async append(revision: Revision): Promise<void> {
    if (!isRevision(revision)) throw new Error("Invalid session revision.");
    if (revision.source && !this.options.debug) throw new Error("Debug session storage is disabled.");
    const folder = revision.source ? DEBUG_SESSION_FOLDER : SESSION_FOLDER;
    for (const path of ["Solanum", folder]) {
      if (!await this.adapter.exists(path)) {
        try { await this.adapter.mkdir(path); }
        catch (error) { if (!await this.adapter.exists(path)) throw error; }
      }
    }
    const path = `${folder}/${revision.sessionId}--${revision.id}.json`;
    const text = JSON.stringify(revision, null, 2);
    if (await this.adapter.exists(path)) {
      if (await this.adapter.read(path) !== text) throw new Error(`Session revision collision: ${path}`);
      return;
    }
    await this.adapter.write(path, text);
  }
}
