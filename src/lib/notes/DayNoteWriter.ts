import { dailyHarvest } from "@/lib/harvest/aggregate";
import { ensureFolder } from "@/lib/storage/ensureFolder";
import { buildDayNote, composeDayNote } from "@/lib/notes/dayNote";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { Revision } from "@/lib/timer/types";

export type DayNoteOutcome = "created" | "updated" | "unchanged" | "empty";

export interface DayNoteTotals {
  created: number;
  updated: number;
  unchanged: number;
}

/** Writes one readable markdown note per day into the vault. Demo and debug data never appears. */
export class DayNoteWriter {
  constructor(
    private adapter: FileAdapter,
    private folder: () => string,
  ) {}

  pathFor(day: Date): string {
    return `${this.folder()}/${dayKey(day)}.md`;
  }

  async write(sessions: Revision[], day: Date, now: number): Promise<DayNoteOutcome> {
    const real = sessions.filter((session) => session.source === undefined);
    const note = buildDayNote(day, dailyHarvest(real, day, {}, now).entries);
    if (!note) return "empty";
    const path = this.pathFor(day);
    const existing = (await this.adapter.exists(path)) ? await this.adapter.read(path) : null;
    const text = composeDayNote(existing, note);
    if (text === existing) return "unchanged";
    await ensureFolder(this.adapter, this.folder());
    await this.adapter.write(path, text);
    return existing === null ? "created" : "updated";
  }

  async writeAll(sessions: Revision[], now: number): Promise<DayNoteTotals> {
    const real = sessions.filter((session) => session.source === undefined);
    const totals: DayNoteTotals = { created: 0, updated: 0, unchanged: 0 };
    for (const day of daysTouched(real, now)) {
      const outcome = await this.write(real, day, now);
      if (outcome !== "empty") totals[outcome] += 1;
    }
    return totals;
  }
}
