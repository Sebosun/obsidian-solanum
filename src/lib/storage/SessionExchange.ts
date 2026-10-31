import { ensureFolder } from "@/lib/storage/ensureFolder";
import { EXPORT_FOLDER, buildExport, canonical, parseExport } from "@/lib/storage/exchange";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import type { TimerService } from "@/lib/timer/TimerService";
import type { SessionStore } from "@/lib/timer/types";

export interface ExportResult {
  path: string;
  count: number;
}

export interface ImportResult {
  added: number;
  /** Revisions the vault already held, byte-for-byte equal in content. */
  duplicates: number;
  /** Ids that exist locally with different content; the local copy was kept. */
  conflicts: string[];
  /** Entries that were not valid revisions. */
  invalid: number;
  /** Simulated or demo revisions, which never join real history. */
  synthetic: number;
}

const pad = (value: number) => String(value).padStart(2, "0");

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
    return { path, count: bundle.sessions.length };
  }

  /** Adds revisions we do not have. Divergent copies of one session stay as a sync conflict. */
  async import(text: string): Promise<ImportResult> {
    const parsed = parseExport(text);
    return this.timer.exclusive(async () => {
      const known = new Map(
        (await this.store.readAll()).map((revision) => [revision.id, revision]),
      );
      const result: ImportResult = {
        added: 0,
        duplicates: 0,
        conflicts: [],
        invalid: parsed.invalid,
        synthetic: 0,
      };
      for (const revision of parsed.revisions) {
        if (revision.source !== undefined) {
          result.synthetic += 1;
          continue;
        }
        const existing = known.get(revision.id);
        if (existing === undefined) {
          await this.store.append(revision);
          known.set(revision.id, revision);
          result.added += 1;
        } else if (canonical(existing) === canonical(revision)) {
          result.duplicates += 1;
        } else {
          result.conflicts.push(revision.id);
        }
      }
      return result;
    });
  }

  private async freePath(): Promise<string> {
    const date = new Date(this.now());
    const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    let path = `${EXPORT_FOLDER}/solanum-sessions-${stamp}.json`;
    for (let attempt = 2; await this.adapter.exists(path); attempt += 1)
      path = `${EXPORT_FOLDER}/solanum-sessions-${stamp}-${attempt}.json`;
    return path;
  }
}
