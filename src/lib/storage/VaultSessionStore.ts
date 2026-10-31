import type { Revision, SessionStore } from "@/lib/timer/types";
import { isRevision } from "@/lib/storage/validation";

export const SESSION_FOLDER = "Solanum/sessions";
export const DEBUG_SESSION_FOLDER = "Solanum/debug-sessions";

export interface DirectoryListing {
  files: string[];
  folders: string[];
}
export interface StorageOptions {
  debug?: boolean;
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
  constructor(
    private adapter: FileAdapter,
    private options: StorageOptions = {},
  ) {}

  async readAll(): Promise<Revision[]> {
    const revisions: Revision[] = [];
    const folders = this.options.debug ? [SESSION_FOLDER, DEBUG_SESSION_FOLDER] : [SESSION_FOLDER];
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
    const folder = revision.source ? DEBUG_SESSION_FOLDER : SESSION_FOLDER;
    for (const path of ["Solanum", folder]) {
      if (!(await this.adapter.exists(path))) {
        try {
          await this.adapter.mkdir(path);
        } catch (error) {
          if (!(await this.adapter.exists(path))) throw error;
        }
      }
    }
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
