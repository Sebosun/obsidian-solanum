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

/** Flat, immutable revision files sync without overwriting another device's edits. */
export class VaultSessionStore implements SessionStore {
  folder: string;

  constructor(
    private adapter: FileAdapter,
    private options: StorageOptions = {},
  ) {
    this.folder = options.folder ?? DEFAULT_SESSION_FOLDER;
  }

  setFolder(folder: string): void {
    this.folder = folder;
  }

  async readAll(): Promise<Revision[]> {
    const revisions: Revision[] = [];
    const folders = this.options.debug ? [this.folder, DEBUG_SESSION_FOLDER] : [this.folder];
    for (const folder of folders) {
      if (!(await this.adapter.exists(folder))) continue;
      const { files } = await this.adapter.list(folder);
      for (const path of files.filter((p) => p.endsWith(".json"))) {
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
        revisions.push(value);
      }
    }
    return revisions;
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
