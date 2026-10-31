import type { Revision, SessionStore } from "@/lib/timer/types";
import { isRevision } from "@/lib/storage/validation";

import { ensureFolder } from "@/lib/storage/ensureFolder";
import { DEBUG_SESSION_FOLDER, DEFAULT_SESSION_FOLDER } from "@/lib/storage/folder";

export interface DirectoryListing {
  files: string[];
  folders: string[];
}
export interface StorageOptions {
  debug?: boolean;
  /** Vault-relative folder for real sessions. Debug sessions always use their own folder. */
  folder?: string;
}

export interface FileAdapter {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<unknown>;
  list(path: string): Promise<DirectoryListing>;
  read(path: string): Promise<string>;
  write(path: string, contents: string): Promise<unknown>;
}

/** How many files are written at once when adding many sessions. */
const WRITE_CONCURRENCY = 12;

/** Flat, immutable revision files sync without overwriting another device's edits. */
export class VaultSessionStore implements SessionStore {
  folder: string;
  /** Revision files never change once written, so each is read and parsed only once. */
  private parsed = new Map<string, Revision>();

  constructor(
    private adapter: FileAdapter,
    private options: StorageOptions = {},
  ) {
    this.folder = options.folder ?? DEFAULT_SESSION_FOLDER;
  }

  setFolder(folder: string): void {
    this.folder = folder;
  }

  /** Every folder whose files make up the history; the debug folder only exists in debug builds. */
  watchedFolders(): string[] {
    return this.options.debug ? [this.folder, DEBUG_SESSION_FOLDER] : [this.folder];
  }

  async readAll(): Promise<Revision[]> {
    const revisions: Revision[] = [];
    const seen = new Set<string>();
    for (const folder of this.watchedFolders()) {
      if (!(await this.adapter.exists(folder))) continue;
      const { files } = await this.adapter.list(folder);
      for (const path of files.filter((p) => p.endsWith(".json"))) {
        seen.add(path);
        const known = this.parsed.get(path);
        if (known) {
          revisions.push(known);
          continue;
        }
        let value: unknown;
        try {
          value = JSON.parse(await this.adapter.read(path));
        } catch {
          throw new Error(
            `Cannot read session file ${path}. Sync may still be in progress; retry shortly.`,
          );
        }
        if (!isRevision(value))
          throw new Error(
            `Invalid or unsupported session schema in ${path}. File preserved; no changes made.`,
          );
        this.parsed.set(path, value);
        revisions.push(value);
      }
    }
    for (const path of this.parsed.keys()) if (!seen.has(path)) this.parsed.delete(path);
    return revisions;
  }

  /**
   * Adds many sessions the caller knows are not stored yet, which is far cheaper than `append`:
   * the folder is made once, nothing is checked or re-read per file, and writes overlap.
   */
  async appendNew(
    revisions: Revision[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    for (const revision of revisions) {
      if (!isRevision(revision)) throw new Error("Invalid session revision.");
      if (revision.source && !this.options.debug)
        throw new Error("Debug session storage is disabled.");
    }
    const jobs = revisions.map((revision) => {
      const folder = revision.source ? DEBUG_SESSION_FOLDER : this.folder;
      return {
        folder,
        path: `${folder}/${revision.sessionId}--${revision.id}.json`,
        text: JSON.stringify(revision, null, 2),
      };
    });
    for (const folder of new Set(jobs.map((job) => job.folder)))
      await ensureFolder(this.adapter, folder);
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        await this.adapter.write(job.path, job.text);
        done += 1;
        onProgress?.(done, jobs.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(WRITE_CONCURRENCY, jobs.length) }, worker));
  }

  async append(revision: Revision): Promise<void> {
    if (!isRevision(revision)) throw new Error("Invalid session revision.");
    if (revision.source && !this.options.debug)
      throw new Error("Debug session storage is disabled.");
    const folder = revision.source ? DEBUG_SESSION_FOLDER : this.folder;
    await ensureFolder(this.adapter, folder);
    const path = `${folder}/${revision.sessionId}--${revision.id}.json`;
    const text = JSON.stringify(revision, null, 2);
    if (await this.adapter.exists(path)) {
      if ((await this.adapter.read(path)) !== text)
        throw new Error(`Session revision collision: ${path}`);
      return;
    }
    await this.adapter.write(path, text);
  }
}
