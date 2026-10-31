import type { MetadataCache, Vault } from "obsidian";

/** Cache suggestions between metadata events, rather than scanning every timer tick. */
export class VaultNoteIndex {
  private tagCache: string[] | null = null;
  private noteCache: string[] | null = null;

  constructor(
    private vault: Vault,
    private metadata: MetadataCache,
  ) {}

  invalidate = () => {
    this.tagCache = null;
    this.noteCache = null;
  };

  tags(): string[] {
    if (this.tagCache) return this.tagCache;
    const tags = new Set<string>();
    for (const file of this.vault.getMarkdownFiles()) {
      const cache = this.metadata.getFileCache(file);
      for (const tag of cache?.tags ?? []) tags.add(tag.tag.replace(/^#/, ""));
      const frontmatter = cache?.frontmatter?.tags;
      for (const tag of Array.isArray(frontmatter)
        ? frontmatter
        : typeof frontmatter === "string"
          ? frontmatter.split(/[,\s]+/)
          : []) {
        if (typeof tag === "string" && tag.trim()) tags.add(tag.trim().replace(/^#/, ""));
      }
    }
    this.tagCache = [...tags].sort();
    return this.tagCache;
  }

  notes(): string[] {
    this.noteCache ??= this.vault
      .getMarkdownFiles()
      .map((file) => file.path)
      .sort();
    return this.noteCache;
  }
}
