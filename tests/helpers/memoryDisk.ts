import type { MigrationAdapter } from "@/lib/storage/migration";

/** Vault adapter semantics: `list` is non-recursive, and files and folders are separate. */
export class MemoryDisk implements MigrationAdapter {
  files = new Map<string, string>();
  folders = new Set<string>();
  /** Paths whose next write fails, to simulate an interrupted move. */
  failWrites = new Set<string>();

  async exists(path: string) {
    return this.files.has(path) || this.folders.has(path);
  }
  async mkdir(path: string) {
    if (this.files.has(path)) throw new Error(`A file exists at ${path}`);
    this.folders.add(path);
  }
  async list(path: string) {
    const prefix = `${path}/`;
    const direct = (entry: string) =>
      entry.startsWith(prefix) && !entry.slice(prefix.length).includes("/");
    return {
      files: [...this.files.keys()].filter(direct),
      folders: [...this.folders].filter(direct),
    };
  }
  async read(path: string) {
    const text = this.files.get(path);
    if (text === undefined) throw new Error(`ENOENT ${path}`);
    return text;
  }
  async write(path: string, contents: string) {
    if (this.failWrites.has(path)) throw new Error(`Write failed: ${path}`);
    const parent = path.slice(0, path.lastIndexOf("/"));
    if (parent && !this.folders.has(parent)) throw new Error(`ENOENT folder ${parent}`);
    this.files.set(path, contents);
  }
  async remove(path: string) {
    if (!this.files.delete(path)) throw new Error(`ENOENT ${path}`);
  }
  async rmdir(path: string) {
    const { files, folders } = await this.list(path);
    if (files.length || folders.length) throw new Error(`Folder not empty: ${path}`);
    this.folders.delete(path);
  }
}
