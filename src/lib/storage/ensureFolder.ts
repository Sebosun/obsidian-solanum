import type { FileAdapter } from "@/lib/storage/VaultSessionStore";

/** Creates every folder on the way to `folder`, tolerating a sync client creating one first. */
export async function ensureFolder(adapter: FileAdapter, folder: string): Promise<void> {
  let path = "";
  for (const segment of folder.split("/")) {
    path = path === "" ? segment : `${path}/${segment}`;
    if (await adapter.exists(path)) continue;
    try {
      await adapter.mkdir(path);
    } catch (error) {
      if (!(await adapter.exists(path))) throw error;
    }
  }
}
