import { isCropId } from "../crops/catalog";
import { isActive, normalizeTags, selectState } from "./selectors";
import type {
  CompletionEvent,
  Revision,
  SessionStore,
  StartOptions,
  TimerState,
  TimerEnvironment,
} from "./types";
import { completePhase } from "./transitions";

/** Timestamp-based state machine. Immutable revisions make concurrent sync edits detectable. */
export class TimerService {
  private revisions = new Map<string, Revision>();
  private state: TimerState = { sessions: [], conflicts: [] };
  private listeners = new Set<() => void>();
  private completionListeners = new Set<(event: CompletionEvent) => void>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private store: SessionStore,
    private env: TimerEnvironment,
  ) {}

  getState = (): TimerState => this.state;
  subscribeCompletion(listener: (event: CompletionEvent) => void): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private notifyCompletion(event: CompletionEvent): void {
    this.completionListeners.forEach((listener) => listener(event));
    this.env.notify?.(event.phase);
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  remaining(s: Revision): number {
    return s.status === "running" && s.deadline !== null
      ? Math.max(0, s.deadline - this.env.now())
      : s.remainingMs;
  }

  private serial<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }

  private publish() {
    this.state = selectState([...this.revisions.values()]);
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
    if (this.state.conflicts.some((c) => c.sessionId === sessionId))
      throw new Error("Resolve the sync conflict first.");
    const session = this.state.sessions.find((s) => s.sessionId === sessionId);
    if (!session) throw new Error("Session not found.");
    return session;
  }

  private next(s: Revision, at = this.env.now()): Revision {
    return { ...structuredClone(s), id: this.env.id(), parents: [s.id], updatedAt: at };
  }

  refresh() {
    return this.serial(async () => {
      await this.load();
      await this.reconcile(false);
    });
  }

  tick() {
    return this.serial(async () => {
      await this.reconcile(true);
      this.publish();
    });
  }

  start(options: StartOptions): Promise<string> {
    return this.serial(async () => {
      await this.load();
      await this.reconcile(false);
      if (this.state.sessions.some(isActive) || this.state.conflicts.length)
        throw new Error("Finish the active session before planting another crop.");
      if (
        ![options.durationMs, options.breakMs].every(
          (v) => Number.isFinite(v) && v >= 60_000 && v <= 24 * 60 * 60_000,
        )
      ) {
        throw new Error("Durations must be between 1 minute and 24 hours.");
      }
      const now = this.env.now();
      if (options.crop !== undefined && !isCropId(options.crop)) throw new Error("Unknown crop.");
      const id = this.env.id();
      await this.save({
        schema: 1,
        id,
        sessionId: id,
        parents: [],
        startedAt: now,
        updatedAt: now,
        ...options,
        tags: normalizeTags(options.tags),
        crop: options.crop ?? "tomato",
        ...(this.env.debug ? { source: "debug" as const } : {}),
        phase: "focus",
        status: "running",
        deadline: now + options.durationMs,
        remainingMs: options.durationMs,
        intervals: [{ start: now, end: null }],
        focusEndedAt: null,
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
      if (s.phase === "focus" && s.status === "running")
        s.intervals[s.intervals.length - 1].end = this.env.now();
      s.status = s.phase === "break" ? "completed" : "cancelled";
      s.phase = "done";
      s.remainingMs = 0;
      s.deadline = null;
    });
  }

  startBreak(sessionId: string) {
    return this.transition(sessionId, (s) => {
      if (s.phase !== "break" || s.status !== "waiting")
        throw new Error("No break is waiting to start.");
      s.status = "running";
      s.deadline = this.env.now() + s.breakMs;
    });
  }

  async debugFinish(sessionId: string) {
    if (!this.env.debug) throw new Error("Debug mode is disabled.");
    let completion: CompletionEvent | undefined;
    await this.transition(sessionId, (s) => {
      if (s.source !== "debug" || !isActive(s))
        throw new Error("Only simulated debug sessions can be force-finished.");
      const phase = s.phase === "focus" ? "focus" : "break";
      const at = this.env.now();
      completion = { sessionId: s.sessionId, crop: s.crop, phase, at };
      completePhase(s, at);
    });
    if (completion) this.notifyCompletion(completion);
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
        const renamed =
          s.notePath === oldPath
            ? newPath
            : s.notePath?.startsWith(`${oldPath}/`)
              ? newPath + s.notePath.slice(oldPath.length)
              : null;
        if (renamed) {
          const next = this.next(s);
          next.notePath = renamed;
          await this.save(next);
        }
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
        completePhase(next, deadline);
        await this.save(next);
        if (notify && this.env.now() - deadline < 10_000 && phase !== "done") {
          this.notifyCompletion({ sessionId: s.sessionId, crop: s.crop, phase, at: deadline });
        }
        s = next;
      }
    }
  }
}
