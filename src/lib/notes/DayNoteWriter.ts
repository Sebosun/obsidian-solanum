import { dailyHarvest } from "@/lib/harvest/aggregate";
import { ensureFolder } from "@/lib/storage/ensureFolder";
import { buildDayNote, composeDayNote } from "@/lib/notes/dayNote";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import { pathForDay } from "@/lib/notes/path";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { Revision } from "@/lib/timer/types";

export type DayNoteOutcome = "created" | "updated" | "unchanged" | "empty";

export interface DayNoteTotals {
  created: number;
  updated: number;
  unchanged: number;
}

export interface DocumentWriteResult extends DayNoteTotals {
  failures: { path: string; reason: string }[];
}

export function describeDocumentTotals(totals: DayNoteTotals): string {
  return `Documents: ${totals.created} new, ${totals.updated} updated, ${totals.unchanged} unchanged.`;
}

export function describeDocuments(result: DocumentWriteResult): string {
  let message = describeDocumentTotals(result);
  if (result.failures.length > 0)
    message += ` ${result.failures.length} failed. Session history is safe. Retry the import or use “Write documents for all history”. ${result.failures[0].reason}`;
  return message;
}

/** Writes one readable markdown note per day into the vault. Demo and debug data never appears. */
export class DayNoteWriter {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private adapter: FileAdapter,
    private folder: () => string,
  ) {}

  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }

  pathFor(day: Date): string {
    return pathForDay(this.folder(), day);
  }

  write(sessions: Revision[], day: Date, now: number): Promise<DayNoteOutcome> {
    return this.exclusive(() => this.writeNow(sessions, day, now));
  }

  private async writeNow(sessions: Revision[], day: Date, now: number): Promise<DayNoteOutcome> {
    const real = sessions.filter((session) => session.source === undefined);
    const note = buildDayNote(day, dailyHarvest(real, day, {}, now).entries);
    if (!note) return "empty";
    const path = this.pathFor(day);
    const existing = (await this.adapter.exists(path)) ? await this.adapter.read(path) : null;
    const text = composeDayNote(existing, note);
    if (text === existing) return "unchanged";
    await ensureFolder(this.adapter, path.slice(0, path.lastIndexOf("/")));
    await this.adapter.write(path, text);
    return existing === null ? "created" : "updated";
  }

  async writeAll(sessions: Revision[], now: number): Promise<DayNoteTotals> {
    const { failures, ...totals } = await this.writeDays(sessions, daysTouched(sessions, now), now);
    if (failures.length > 0) throw new Error(describeDocuments({ ...totals, failures }));
    return totals;
  }

  writeDays(
    sessions: Revision[],
    days: Date[],
    now: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<DocumentWriteResult> {
    return this.exclusive(() => this.writeDaysNow(sessions, days, now, onProgress));
  }

  private async writeDaysNow(
    sessions: Revision[],
    days: Date[],
    now: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<DocumentWriteResult> {
    const real = sessions.filter((session) => session.source === undefined);
    // Index once rather than scanning the entire history for each imported day.
    const indexed = new Map<string, Revision[]>();
    for (const session of real) {
      for (const day of daysTouched([session], now)) {
        const key = dayKey(day);
        const bucket = indexed.get(key) ?? [];
        bucket.push(session);
        indexed.set(key, bucket);
      }
    }
    const totals: DocumentWriteResult = { created: 0, updated: 0, unchanged: 0, failures: [] };
    let done = 0;
    for (const day of days) {
      try {
        const outcome = await this.writeNow(indexed.get(dayKey(day)) ?? [], day, now);
        if (outcome !== "empty") totals[outcome] += 1;
      } catch (error) {
        totals.failures.push({
          path: this.pathFor(day),
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      done += 1;
      onProgress?.(done, days.length);
    }
    return totals;
  }
}
