import { TFile, type CachedMetadata, type MetadataCache, type Vault } from "obsidian";

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
    for (const file of this.vault.getMarkdownFiles())
      for (const tag of tagsIn(this.metadata.getFileCache(file))) tags.add(tag);
    this.tagCache = [...tags].sort();
    return this.tagCache;
  }

  /** The tags of one note, in the order it has them: inline ones first, then its frontmatter's. */
  tagsOf(path: string): string[] {
    const file = this.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return [];
    return [...tagsIn(this.metadata.getFileCache(file))];
  }

  notes(): string[] {
    this.noteCache ??= this.vault
      .getMarkdownFiles()
      .map((file) => file.path)
      .sort();
    return this.noteCache;
  }
}

/** Every tag a note's cached metadata holds, inline or in frontmatter, without the leading #. */
function tagsIn(cache: CachedMetadata | null | undefined): Set<string> {
  const tags = new Set<string>();
  for (const tag of cache?.tags ?? []) tags.add(tag.tag.replace(/^#/, ""));
  const frontmatter: unknown = cache?.frontmatter?.tags;
  const listed = Array.isArray(frontmatter)
    ? frontmatter
    : typeof frontmatter === "string"
      ? frontmatter.split(/[,\s]+/)
      : [];
  for (const tag of listed)
    if (typeof tag === "string" && tag.trim()) tags.add(tag.trim().replace(/^#/, ""));
  return tags;
}
