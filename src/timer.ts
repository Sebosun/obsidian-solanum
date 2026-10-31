export type Phase = "focus" | "break" | "done";
export type Status = "running" | "paused" | "waiting" | "completed" | "cancelled";
export interface Revision {
  schema: 1;
  id: string;
  sessionId: string;
  parents: string[];
  startedAt: number;
  updatedAt: number;
  durationMs: number;
  breakMs: number;
  autoBreak: boolean;
  phase: Phase;
  status: Status;
  deadline: number | null;
  remainingMs: number;
  focusEndedAt: number | null;
  intervals: { start: number; end: number | null }[];
  tags: string[];
  notePath: string | null;
  crop: "tomato";
}

export interface SessionStore {
  readAll(): Promise<Revision[]>;
  append(revision: Revision): Promise<void>;
}

export interface StartOptions {
  durationMs: number;
  breakMs: number;
  autoBreak: boolean;
  tags: string[];
  notePath: string | null;
}

interface State {
  sessions: Revision[];
  conflicts: { sessionId: string; versions: Revision[] }[];
}

export const isActive = (s: Revision) => s.phase !== "done";
export const normalizeTags = (tags: string[]) => [...new Set(tags.map((t) => t.trim().replace(/^#+/, "")).filter(Boolean))];

/** Timestamp-based state machine. Immutable revisions make concurrent sync edits detectable. */
export class TimerService {
  private revisions = new Map<string, Revision>();
  private state: State = { sessions: [], conflicts: [] };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private store: SessionStore, private env: {
    now: () => number;
    id: () => string;
    notify?: (phase: "focus" | "break") => void;
  }) {}

  getState = (): State => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  remaining(s: Revision): number {
    return s.status === "running" && s.deadline !== null
      ? Math.max(0, s.deadline - this.env.now()) : s.remainingMs;
  }

  private serial<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }

  private publish() {
    const parents = new Set([...this.revisions.values()].flatMap((r) => r.parents));
    const groups = new Map<string, Revision[]>();
    for (const r of this.revisions.values()) {
      if (parents.has(r.id)) continue;
      const group = groups.get(r.sessionId) ?? [];
      group.push(r);
      groups.set(r.sessionId, group);
    }
    const sessions: Revision[] = [];
    const conflicts: State["conflicts"] = [];
    for (const [sessionId, versions] of groups) {
      versions.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
      sessions.push(versions[0]);
      if (versions.length > 1) conflicts.push({ sessionId, versions });
    }
    this.state = { sessions: sessions.sort((a, b) => b.startedAt - a.startedAt), conflicts };
    this.listeners.forEach((listener) => listener());
  }

  private async load() {
    // Keep known revisions while sync delivers files incrementally. Never interpret a missing file as deletion.
    for (const revision of await this.store.readAll()) this.revisions.set(revision.id, revision);
    this.publish();
  }

  private async save(revision: Revision) {
    await this.store.append(revision);
    this.revisions.set(revision.id, revision);
    this.publish();
  }

  private current(sessionId: string): Revision {
    if (this.state.conflicts.some((c) => c.sessionId === sessionId)) throw new Error("Resolve the sync conflict first.");
    const session = this.state.sessions.find((s) => s.sessionId === sessionId);
    if (!session) throw new Error("Session not found.");
    return session;
  }

  private next(s: Revision, at = this.env.now()): Revision {
    return { ...structuredClone(s), id: this.env.id(), parents: [s.id], updatedAt: at };
  }

  refresh() {
    return this.serial(async () => { await this.load(); await this.reconcile(false); });
  }

  tick() {
    return this.serial(async () => { await this.reconcile(true); this.publish(); });
  }

  start(options: StartOptions): Promise<string> {
    return this.serial(async () => {
      await this.load();
      await this.reconcile(false);
      if (this.state.sessions.some(isActive) || this.state.conflicts.length) throw new Error("Finish the active session before planting another crop.");
      if (![options.durationMs, options.breakMs].every((v) => Number.isFinite(v) && v >= 60_000 && v <= 24 * 60 * 60_000)) {
        throw new Error("Durations must be between 1 minute and 24 hours.");
      }
      const now = this.env.now();
      const id = this.env.id();
      await this.save({
        schema: 1, id, sessionId: id, parents: [], startedAt: now, updatedAt: now,
        ...options, tags: normalizeTags(options.tags), crop: "tomato",
        phase: "focus", status: "running", deadline: now + options.durationMs,
        remainingMs: options.durationMs, intervals: [{ start: now, end: null }], focusEndedAt: null,
      });
      return id;
    });
  }

  private transition(sessionId: string, change: (next: Revision) => void) {
    return this.serial(async () => {
      await this.load();
      await this.reconcile(false);
      const next = this.next(this.current(sessionId));
      change(next);
      await this.save(next);
    });
  }

  pause(sessionId: string) {
    return this.transition(sessionId, (s) => {
      if (s.status !== "running") throw new Error("Only a running timer can be paused.");
      s.remainingMs = this.remaining(s);
      s.status = "paused";
      s.deadline = null;
      if (s.phase === "focus") s.intervals[s.intervals.length - 1].end = this.env.now();
    });
  }

  resume(sessionId: string) {
    return this.transition(sessionId, (s) => {
      if (s.status !== "paused") throw new Error("Only a paused timer can be resumed.");
      s.status = "running";
      s.deadline = this.env.now() + s.remainingMs;
      if (s.phase === "focus") s.intervals.push({ start: this.env.now(), end: null });
    });
  }

  cancel(sessionId: string) {
    return this.transition(sessionId, (s) => {
      if (!isActive(s)) throw new Error("This session has already ended.");
      if (s.phase === "focus" && s.status === "running") s.intervals[s.intervals.length - 1].end = this.env.now();
      s.status = s.phase === "break" ? "completed" : "cancelled";
      s.phase = "done";
      s.remainingMs = 0;
      s.deadline = null;
    });
  }

  startBreak(sessionId: string) {
    return this.transition(sessionId, (s) => {
      if (s.phase !== "break" || s.status !== "waiting") throw new Error("No break is waiting to start.");
      s.status = "running";
      s.deadline = this.env.now() + s.breakMs;
    });
  }

  resolve(sessionId: string, revisionId: string) {
    return this.serial(async () => {
      await this.load();
      const conflict = this.state.conflicts.find((c) => c.sessionId === sessionId);
      const chosen = conflict?.versions.find((r) => r.id === revisionId);
      if (!chosen || !conflict) throw new Error("Conflict changed; refresh and choose again.");
      const next = this.next(chosen);
      next.parents = conflict.versions.map((r) => r.id);
      await this.save(next);
      await this.reconcile(false);
    });
  }

  renameNote(oldPath: string, newPath: string) {
    return this.serial(async () => {
      await this.load();
      for (const s of this.state.sessions) {
        if (this.state.conflicts.some((c) => c.sessionId === s.sessionId)) continue;
        const renamed = s.notePath === oldPath ? newPath
          : s.notePath?.startsWith(`${oldPath}/`) ? newPath + s.notePath.slice(oldPath.length) : null;
        if (renamed) { const next = this.next(s); next.notePath = renamed; await this.save(next); }
      }
    });
  }

  private async reconcile(notify: boolean) {
    for (const initial of this.state.sessions) {
      if (this.state.conflicts.some((c) => c.sessionId === initial.sessionId)) continue;
      let s = initial;
      while (s.status === "running" && s.deadline !== null && s.deadline <= this.env.now()) {
        const phase = s.phase;
        const deadline = s.deadline;
        const next = this.next(s, deadline);
        // Deterministic expiry revisions deduplicate recovery on multiple devices.
        next.id = `${s.id}-elapsed`;
        if (phase === "focus") {
          next.intervals[next.intervals.length - 1].end = deadline;
          next.focusEndedAt = deadline;
          next.phase = "break";
          next.status = s.autoBreak ? "running" : "waiting";
          next.remainingMs = s.breakMs;
          next.deadline = s.autoBreak ? deadline + s.breakMs : null;
        } else {
          next.phase = "done";
          next.status = "completed";
          next.remainingMs = 0;
          next.deadline = null;
        }
        await this.save(next);
        if (notify && this.env.now() - deadline < 10_000 && phase !== "done") this.env.notify?.(phase);
        s = next;
      }
    }
  }
}
