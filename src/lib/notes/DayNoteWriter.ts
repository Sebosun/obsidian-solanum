import { dailyHarvest } from "@/lib/harvest/aggregate";
import { ensureFolder } from "@/lib/storage/ensureFolder";
import { buildDayNote, composeDayNote } from "@/lib/notes/dayNote";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import { pathForDay } from "@/lib/notes/path";
import type { DayNoteOutcome, DocumentWriteResult } from "@/lib/notes/documentReport";
import { errorMessage } from "@/lib/text";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { Revision } from "@/lib/timer/types";

/**
 * Writes one readable markdown note per day into the vault. Demo and debug data never appears.
 * Callers serialize their own writes; `DayNoteService` is the only one.
 */
export class DayNoteWriter {
  constructor(
    private adapter: FileAdapter,
    private folder: () => string,
  ) {}

  private pathFor(day: Date): string {
    return pathForDay(this.folder(), day);
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

  async writeDays(
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
        totals.failures.push({ path: this.pathFor(day), reason: errorMessage(error) });
      }
      done += 1;
      onProgress?.(done, days.length);
    }
    return totals;
  }
}
