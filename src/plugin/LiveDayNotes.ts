import { dayKey } from "@/lib/harvest/model";
import { daysTouched } from "@/lib/notes/days";
import type { TimerService } from "@/lib/timer/TimerService";

/** Writes of one burst of changes are batched together this long. */
export const DAY_NOTE_DEBOUNCE_MS = 1_500;
/** A sync that changes more days than this is a backfill, left to an explicit action. */
export const AUTO_DAY_NOTE_MAX_DAYS = 14;

export interface LiveDayNotesPorts {
  timer: Pick<TimerService, "getState" | "subscribe">;
  /** Whether live updates are wanted right now (the setting is on and the plugin is running). */
  enabled(): boolean;
  isImporting(sessionId: string): boolean;
  now(): number;
  /** Writes the documents for these days. */
  write(days: Date[]): void;
}

/** Keeps each day's document up to date as real sessions change, a moment after they do. */
export class LiveDayNotes {
  private seen = new Map<string, string>();
  private pending = new Map<string, Date>();
  private timer: number | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private ports: LiveDayNotesPorts) {}

  /** Existing history is the baseline: documents follow changes, they are not backfilled. */
  start(): void {
    for (const session of this.ports.timer.getState().sessions)
      this.seen.set(session.sessionId, session.id);
    this.unsubscribe = this.ports.timer.subscribe(this.onSessionsChanged);
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private onSessionsChanged = () => {
    const { sessions } = this.ports.timer.getState();
    const changed = sessions.filter(
      (session) =>
        session.source === undefined &&
        this.seen.get(session.sessionId) !== session.id &&
        !this.ports.isImporting(session.sessionId),
    );
    for (const session of sessions) this.seen.set(session.sessionId, session.id);
    if (!this.ports.enabled() || changed.length === 0) return;
    const touched = daysTouched(changed, this.ports.now());
    // Bound unsolicited sync backfills. Explicit imports write all their dates separately.
    if (touched.length > AUTO_DAY_NOTE_MAX_DAYS) return;
    for (const day of touched) this.pending.set(dayKey(day), day);
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.flush, DAY_NOTE_DEBOUNCE_MS);
  };

  private flush = () => {
    const days = [...this.pending.values()];
    this.pending.clear();
    this.timer = null;
    this.ports.write(days);
  };
}
