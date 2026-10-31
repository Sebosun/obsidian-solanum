import { ensureFolder } from "@/lib/storage/ensureFolder";
import { EXPORT_FOLDER, buildExport, canonical, type ImportResult } from "@/lib/storage/exchange";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { TimerService } from "@/lib/timer/TimerService";
import type { Revision, SessionStore } from "@/lib/timer/types";
import { dayKey } from "@/lib/harvest/model";

export interface ImportOptions {
  createDocuments?: boolean;
  onDocumentProgress?: (done: number, total: number) => void;
}

export interface ExportResult {
  path: string;
  /** Revisions written; a session that was paused or resumed has several. */
  count: number;
  /** Distinct sessions those revisions belong to. */
  sessions: number;
}

/** Moves the full revision history in and out of a single portable JSON file. */
export class SessionExchange {
  constructor(
    private adapter: FileAdapter,
    private store: SessionStore,
    private timer: Pick<TimerService, "exclusive">,
    private now: () => number,
  ) {}

  async export(): Promise<ExportResult> {
    const bundle = buildExport(await this.store.readAll(), this.now());
    await ensureFolder(this.adapter, EXPORT_FOLDER);
    const path = await this.freePath();
    await this.adapter.write(path, JSON.stringify(bundle, null, 2));
    const sessions = new Set(bundle.sessions.map((revision) => revision.sessionId)).size;
    return { path, count: bundle.sessions.length, sessions };
  }

  /** The shared way revisions join the history, whatever file they came from. Divergent copies of one session stay as a sync conflict. */
  importRevisions(
    revisions: Revision[],
    invalid = 0,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult> {
    return this.timer.exclusive(async () => {
      const known = new Map(
        (await this.store.readAll()).map((revision) => [revision.id, revision]),
      );
      const result: ImportResult = {
        added: 0,
        duplicates: 0,
        conflicts: [],
        invalid,
        synthetic: 0,
      };
      const toAdd: Revision[] = [];
      for (const revision of revisions) {
        if (revision.source !== undefined) {
          result.synthetic += 1;
          continue;
        }
        const existing = known.get(revision.id);
        if (existing === undefined) {
          toAdd.push(revision);
          known.set(revision.id, revision);
        } else if (canonical(existing) === canonical(revision)) {
          result.duplicates += 1;
        } else {
          result.conflicts.push(revision.id);
        }
      }
      if (this.store.appendNew) await this.store.appendNew(toAdd, onProgress);
      else for (const revision of toAdd) await this.store.append(revision);
      result.added = toAdd.length;
      return result;
    });
  }

  private async freePath(): Promise<string> {
    const stamp = dayKey(new Date(this.now()));
    let path = `${EXPORT_FOLDER}/solanum-sessions-${stamp}.json`;
    for (let attempt = 2; await this.adapter.exists(path); attempt += 1)
      path = `${EXPORT_FOLDER}/solanum-sessions-${stamp}-${attempt}.json`;
    return path;
  }
}
