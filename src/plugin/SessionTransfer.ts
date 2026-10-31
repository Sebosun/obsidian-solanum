import {
  buildForestRevisions,
  matchNote,
  parseForestCsv,
  type ForestImportResult,
  type ForestMapping,
} from "@/lib/import/forest";
import type { DayNoteService } from "@/lib/notes/DayNoteService";
import { daysTouched } from "@/lib/notes/days";
import { parseExport, type ImportResult } from "@/lib/storage/exchange";
import type { ImportOptions, SessionExchange } from "@/lib/storage/SessionExchange";
import { MS_PER_MINUTE } from "@/lib/time";
import type { Revision } from "@/lib/timer/types";
import type { ImportTracker } from "@/plugin/ImportTracker";

export interface SessionTransferPorts {
  exchange: SessionExchange;
  dayNotes: DayNoteService;
  imports: ImportTracker;
  /** Vault notes a Forest note may refer to. */
  notes(): string[];
  breakMinutes(): number;
  /** The sessions whose documents can be written now. */
  writableSessions(): Revision[];
  now(): number;
}

/** Brings sessions in from a backup or a Forest export, then writes the documents they touch. */
export class SessionTransfer {
  constructor(private ports: SessionTransferPorts) {}

  importSessions = async (text: string, options: ImportOptions = {}): Promise<ImportResult> => {
    const parsed = parseExport(text);
    return this.importWithDocuments(parsed.revisions, parsed.invalid, options);
  };

  importForest = async (
    csv: string,
    mapping: ForestMapping,
    options: ImportOptions = {},
  ): Promise<ForestImportResult> => {
    const parse = parseForestCsv(csv);
    const notes = this.ports.notes();
    const built = buildForestRevisions(parse.entries, mapping, {
      breakMs: this.ports.breakMinutes() * MS_PER_MINUTE,
      resolveNote: (text) => matchNote(text, notes),
    });
    const imported = await this.importWithDocuments(built.revisions, 0, {
      ...options,
      createDocuments: options.createDocuments ?? mapping.createDocuments,
    });
    return {
      imported,
      failed: built.failed,
      invalidRows: parse.problems.length,
      notesDropped: built.notesDropped,
    };
  };

  private async importWithDocuments(
    revisions: Revision[],
    invalid: number,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const ids = new Set(
      revisions
        .filter((revision) => revision.source === undefined)
        .map((revision) => revision.sessionId),
    );
    const result = await this.ports.imports.track(ids, () =>
      this.ports.exchange.importRevisions(revisions, invalid),
    );
    if (options.createDocuments === false || ids.size === 0) return result;
    const sessions = this.ports.writableSessions();
    const now = this.ports.now();
    result.documents = await this.ports.dayNotes.writeDays(
      sessions,
      daysTouched(
        sessions.filter((session) => ids.has(session.sessionId)),
        now,
      ),
      now,
      options.onDocumentProgress,
    );
    return result;
  }
}
