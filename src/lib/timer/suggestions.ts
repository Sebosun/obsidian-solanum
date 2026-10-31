export interface Suggestion {
  value: string;
  label: string;
  /** Muted secondary text, such as a note's folder. */
  detail?: string;
}

/** Notes are searched, so a few best matches will do; tags are few enough to all be shown. */
const MAX_NOTE_SUGGESTIONS = 8;

/** Strips Obsidian's leading "#" so tags read as plain names everywhere in the UI. */
export const cleanTag = (value: string) => value.trim().replace(/^#+/, "");

export function tagSuggestions(known: string[], chosen: string[], query: string): Suggestion[] {
  const needle = cleanTag(query).toLowerCase();
  const matches = known
    .filter((tag) => !chosen.includes(tag) && tag.toLowerCase().includes(needle))
    .sort()
    .map((tag) => ({ value: tag, label: tag }));
  if (matches.length === 0 && needle !== "" && !chosen.includes(cleanTag(query)))
    return [{ value: cleanTag(query), label: cleanTag(query) }];
  return matches;
}

export const noteName = (path: string) => (path.split("/").pop() ?? path).replace(/\.md$/, "");
export const noteFolder = (path: string) => path.split("/").slice(0, -1).join("/");

export function noteSuggestions(notes: string[], query: string): Suggestion[] {
  const needle = query.trim().toLowerCase();
  const scored = notes
    .filter((path) => path.toLowerCase().includes(needle))
    .map((path) => ({ path, byName: noteName(path).toLowerCase().includes(needle) }))
    .sort((a, b) => Number(b.byName) - Number(a.byName) || a.path.localeCompare(b.path));
  return scored.slice(0, MAX_NOTE_SUGGESTIONS).map(({ path }) => ({
    value: path,
    label: noteName(path),
    detail: noteFolder(path),
  }));
}

/** Next highlighted row when arrowing through `count` rows; wraps, and -1 means none. */
export function nextIndex(current: number, step: 1 | -1, count: number): number {
  if (count === 0) return -1;
  if (current < 0) return step === 1 ? 0 : count - 1;
  return (current + step + count) % count;
}
