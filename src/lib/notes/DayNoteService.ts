import {
  DayNoteWriter,
  describeDocuments,
  type DayNoteOutcome,
  type DayNoteTotals,
  type DocumentWriteResult,
} from "@/lib/notes/DayNoteWriter";
import { daysTouched } from "@/lib/notes/days";
import {
  moveDayNotes,
  planDayNoteMigration,
  type DayNoteMigrationPlan,
} from "@/lib/notes/migration";
import { pathForDay } from "@/lib/notes/path";
import { DEFAULT_DAY_NOTES_FOLDER, LEGACY_DAY_NOTES_FOLDER } from "@/lib/storage/folder";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { Revision } from "@/lib/timer/types";

/** Layout is migration metadata, never a choice of output format. All new writes use calendar paths. */
export interface DayNoteLocation {
  dayNotesFolder: string;
  dayNotesLayout: "flat" | "calendar";
  dayNotesMigrationRoot: string | null;
}

interface DayNoteAdapter extends FileAdapter {
  rmdir(path: string, recursive: boolean): Promise<unknown>;
}

export interface DayNoteServicePorts {
  adapter: DayNoteAdapter;
  getLocation(): DayNoteLocation;
  saveLocation(location: DayNoteLocation): Promise<void>;
  /** Obsidian's file manager owns link updates. */
  rename(from: string, to: string): Promise<void>;
}

/** The single entry point for live notes, imports, backfill, opening notes, and legacy migration. */
export class DayNoteService {
  private queue: Promise<unknown> = Promise.resolve();
  private writer: DayNoteWriter;

  constructor(private ports: DayNoteServicePorts) {
    this.writer = new DayNoteWriter(ports.adapter, () => this.calendarRoot());
  }

  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }

  private calendarRoot(): string {
    const location = this.ports.getLocation();
    if (location.dayNotesMigrationRoot) return location.dayNotesMigrationRoot;
    if (location.dayNotesLayout === "flat" && location.dayNotesFolder === LEGACY_DAY_NOTES_FOLDER)
      return DEFAULT_DAY_NOTES_FOLDER;
    return location.dayNotesFolder;
  }

  pathFor(day: Date): string {
    return pathForDay(this.calendarRoot(), day);
  }

  async write(sessions: Revision[], day: Date, now: number): Promise<DayNoteOutcome> {
    const totals = this.successful(await this.writeDays(sessions, [day], now));
    if (totals.created > 0) return "created";
    if (totals.updated > 0) return "updated";
    if (totals.unchanged > 0) return "unchanged";
    return "empty";
  }

  async writeAll(sessions: Revision[], now: number): Promise<DayNoteTotals> {
    const real = sessions.filter((session) => session.source === undefined);
    return this.successful(await this.writeDays(real, daysTouched(real, now), now));
  }

  /** Every write goes through the same migration/recovery and calendar-only writer. */
  writeDays(
    sessions: Revision[],
    days: Date[],
    now: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<DocumentWriteResult> {
    return this.exclusive(async () => {
      try {
        await this.migrateNow();
      } catch (error) {
        return {
          created: 0,
          updated: 0,
          unchanged: 0,
          failures: [
            {
              path: this.calendarRoot(),
              reason: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
      return this.writer.writeDays(sessions, days, now, onProgress);
    });
  }

  private successful(result: DocumentWriteResult): DayNoteTotals {
    const { failures, ...totals } = result;
    if (failures.length > 0) throw new Error(describeDocuments(result));
    return totals;
  }

  planMigration(): Promise<DayNoteMigrationPlan> {
    return this.exclusive(() => this.planMigrationNow());
  }

  private planMigrationNow(): Promise<DayNoteMigrationPlan> {
    return planDayNoteMigration(
      this.ports.adapter,
      this.ports.getLocation().dayNotesFolder,
      this.calendarRoot(),
    );
  }

  private async migrateNow(): Promise<number> {
    const location = this.ports.getLocation();
    if (location.dayNotesLayout === "calendar" && location.dayNotesMigrationRoot === null) return 0;
    const from = location.dayNotesFolder;
    const to = this.calendarRoot();
    const plan = await this.planMigrationNow();
    if (plan.conflicts.length > 0)
      throw new Error(
        `Documents already exist at ${plan.conflicts.join(", ")}. Nothing was moved.`,
      );
    // Persist before moving, so every caller resumes rather than recreating old source documents.
    await this.ports.saveLocation({
      dayNotesFolder: from,
      dayNotesLayout: location.dayNotesLayout,
      dayNotesMigrationRoot: to,
    });
    const moved = await moveDayNotes(this.ports.adapter, from, to, this.ports.rename);
    if (from !== to && (await this.ports.adapter.exists(from))) {
      const { files, folders } = await this.ports.adapter.list(from);
      if (files.length === 0 && folders.length === 0) await this.ports.adapter.rmdir(from, false);
    }
    await this.ports.saveLocation({
      dayNotesFolder: to,
      dayNotesLayout: "calendar",
      dayNotesMigrationRoot: null,
    });
    return moved;
  }
}
