import { describe, expect, it, vi } from "vitest";
import { TFile, type MetadataCache, type Vault } from "obsidian";
import { VaultNoteIndex } from "@/plugin/VaultNoteIndex";

vi.mock("obsidian", () => ({ TFile: class {} }));

interface Cache {
  tags?: { tag: string }[];
  frontmatter?: { tags?: unknown };
}

function index(files: Record<string, Cache | undefined>) {
  const toFile = (path: string) => Object.assign(new TFile(), { path });
  const vault = {
    getMarkdownFiles: () => Object.keys(files).map(toFile),
    getAbstractFileByPath: (path: string) => (path in files ? toFile(path) : null),
  } as unknown as Vault;
  const metadata = {
    getFileCache: vi.fn((file: TFile) => files[file.path]),
  } as unknown as MetadataCache;
  return new VaultNoteIndex(vault, metadata);
}

describe("the tags of one note", () => {
  it("are its inline tags and its frontmatter tags, without the #, once each", () => {
    const notes = index({
      "A.md": {
        tags: [{ tag: "#work" }, { tag: "#work" }, { tag: "#deep/focus" }],
        frontmatter: { tags: ["study", "#work"] },
      },
    });
    expect(notes.tagsOf("A.md").sort()).toEqual(["deep/focus", "study", "work"]);
  });

  it("read frontmatter written as one string, split on commas or spaces", () => {
    const notes = index({ "A.md": { frontmatter: { tags: "one, two  three" } } });
    expect(notes.tagsOf("A.md").sort()).toEqual(["one", "three", "two"]);
  });

  it("ignore frontmatter tags that are not text", () => {
    const notes = index({ "A.md": { frontmatter: { tags: ["fine", 7, null, "  ", { a: 1 }] } } });
    expect(notes.tagsOf("A.md")).toEqual(["fine"]);
  });

  it("are none for a note without tags, with nothing cached yet, or that does not exist", () => {
    const notes = index({ "Plain.md": {}, "Uncached.md": undefined });
    expect(notes.tagsOf("Plain.md")).toEqual([]);
    expect(notes.tagsOf("Uncached.md")).toEqual([]);
    expect(notes.tagsOf("Missing.md")).toEqual([]);
  });

  it("are not found for something that is not a note", () => {
    const vault = { getAbstractFileByPath: () => ({ path: "Folder" }) } as unknown as Vault;
    const metadata = { getFileCache: vi.fn() } as unknown as MetadataCache;
    expect(new VaultNoteIndex(vault, metadata).tagsOf("Folder")).toEqual([]);
    expect(metadata.getFileCache).not.toHaveBeenCalled();
  });

  it("agree with the vault-wide list, which is the union of every note's", () => {
    const notes = index({
      "A.md": { tags: [{ tag: "#a" }] },
      "B.md": { frontmatter: { tags: ["b", "a"] } },
    });
    expect(notes.tags()).toEqual(["a", "b"]);
  });
});
