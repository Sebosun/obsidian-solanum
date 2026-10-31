import { CROPS, type CropId } from "@/lib/crops/catalog";
import type { ImportResult } from "@/lib/storage/SessionExchange";
import { normalizeTags } from "@/lib/timer/selectors";
import type { Revision } from "@/lib/timer/types";

export interface ForestEntry {
  start: number;
  end: number;
  tag: string;
  note: string;
  tree: string;
  success: boolean;
  /** Row number in the file, counting the header as 1. */
  line: number;
}

export interface ForestProblem {
  line: number;
  reason: string;
}

export interface ForestParse {
  entries: ForestEntry[];
  problems: ForestProblem[];
}

export interface ForestPreview {
  total: number;
  successful: number;
  failed: number;
  /** Start of the first and end of the last finished session, or null when there are none. */
  first: number | null;
  last: number | null;
  /** Tags and trees of finished sessions only, most used first. */
  tags: { name: string; count: number }[];
  trees: { name: string; count: number }[];
  problems: ForestProblem[];
}

export interface ForestMapping {
  /** Forest tag → Obsidian tag; an empty value means no tag. */
  tags: Record<string, string>;
  /** Forest tree type → our crop. */
  trees: Record<string, CropId>;
}

export interface ForestBuild {
  revisions: Revision[];
  /** Sessions the user stopped in Forest, which earn nothing here either. */
  failed: number;
  /** Notes that did not match a note in the vault. */
  notesDropped: number;
}

export interface ForestImportResult {
  imported: ImportResult;
  failed: number;
  invalidRows: number;
  notesDropped: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FOREST_TIME =
  /^\w{3} (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) GMT([+-])(\d{2}):(\d{2}) (\d{4})$/;
const NOT_FOREST =
  "This does not look like a Forest export (expected Start Time and End Time columns).";
const CROP_IDS = Object.keys(CROPS) as CropId[];
const MINUTE_MS = 60_000;

/** "Wed Jul 28 12:53:32 GMT+02:00 2021" as a timestamp, honouring the offset in the text. */
export function parseForestDate(text: string): number | null {
  const match = FOREST_TIME.exec(text.trim());
  if (!match) return null;
  const month = MONTHS.indexOf(match[1]);
  const [day, hour, minute, second, year] = [match[2], match[3], match[4], match[5], match[9]].map(
    Number,
  );
  if (month < 0) return null;
  const utc = Date.UTC(year, month, day, hour, minute, second);
  const check = new Date(utc);
  if (check.getUTCMonth() !== month || check.getUTCDate() !== day) return null;
  const offset =
    (Number(match[7]) * 60 + Number(match[8])) * MINUTE_MS * (match[6] === "-" ? -1 : 1);
  return utc - offset;
}

/** Splits CSV into records of fields: quoted fields, doubled quotes, and line breaks inside quotes. */
function readCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  // Exports from some devices start with a byte-order mark.
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quoted) {
      if (char === '"' && body[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && body[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records.filter((fields) => fields.some((value) => value.trim() !== ""));
}

export function parseForestCsv(text: string): ForestParse {
  const [header, ...rows] = readCsv(text);
  if (!header) throw new Error(NOT_FOREST);
  const column = (name: string) => header.findIndex((value) => value.trim().toLowerCase() === name);
  const [start, end, tag, note, tree, success] = [
    "start time",
    "end time",
    "tag",
    "note",
    "tree type",
    "is success",
  ].map(column);
  if (start < 0 || end < 0) throw new Error(NOT_FOREST);
  const cell = (row: string[], index: number) => (index < 0 ? "" : (row[index] ?? ""));
  const entries: ForestEntry[] = [];
  const problems: ForestProblem[] = [];
  rows.forEach((row, index) => {
    const line = index + 2;
    const from = parseForestDate(cell(row, start));
    const to = parseForestDate(cell(row, end));
    if (from === null) problems.push({ line, reason: "The start time could not be read." });
    else if (to === null) problems.push({ line, reason: "The end time could not be read." });
    else if (to <= from) problems.push({ line, reason: "The session ends before it starts." });
    else
      entries.push({
        start: from,
        end: to,
        tag: cell(row, tag).trim(),
        note: cell(row, note).trim(),
        tree: cell(row, tree).trim(),
        success: cell(row, success).trim().toLowerCase() === "true",
        line,
      });
  });
  return { entries, problems };
}

function ranked(values: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function previewForest({ entries, problems }: ForestParse): ForestPreview {
  const finished = entries.filter((entry) => entry.success);
  return {
    total: entries.length,
    successful: finished.length,
    failed: entries.length - finished.length,
    first: finished.length ? Math.min(...finished.map((entry) => entry.start)) : null,
    last: finished.length ? Math.max(...finished.map((entry) => entry.end)) : null,
    tags: ranked(finished.map((entry) => entry.tag)),
    trees: ranked(finished.map((entry) => entry.tree)),
    problems,
  };
}

/** A Forest tag as an Obsidian tag: no spaces or punctuation, never only digits, "/" kept for nesting. */
export function sanitizeTag(name: string): string {
  const tag = name
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_\-/]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
  return /^\p{N}*$/u.test(tag) ? "" : tag;
}

/** Suggested mapping: tidy tag names, and our crops handed out to trees by how often they were used. */
export function defaultForestMapping(preview: ForestPreview): ForestMapping {
  return {
    tags: Object.fromEntries(preview.tags.map(({ name }) => [name, sanitizeTag(name)])),
    trees: Object.fromEntries(
      preview.trees.map(({ name }, index) => [name, CROP_IDS[index % CROP_IDS.length]]),
    ),
  };
}

/** The vault note a Forest note refers to, or null when it is free text or ambiguous. */
export function matchNote(text: string, notes: string[]): string | null {
  const wanted = text.trim().replace(/\.md$/i, "").toLowerCase();
  if (!wanted) return null;
  const withoutExtension = (path: string) => path.replace(/\.md$/i, "").toLowerCase();
  const byPath = notes.filter((path) => withoutExtension(path) === wanted);
  if (byPath.length === 1) return byPath[0];
  const byName = notes.filter((path) => withoutExtension(path).split("/").pop() === wanted);
  return byName.length === 1 && !wanted.includes("/") ? byName[0] : null;
}

/** Stable 32-bit FNV-1a hash as eight hex digits. */
function fnv(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildForestRevisions(
  entries: ForestEntry[],
  mapping: ForestMapping,
  options: { breakMs: number; resolveNote(text: string): string | null },
): ForestBuild {
  const revisions: Revision[] = [];
  let failed = 0;
  let notesDropped = 0;
  for (const entry of entries) {
    if (!entry.success) {
      failed += 1;
      continue;
    }
    const mapped = entry.tag ? sanitizeTag(mapping.tags[entry.tag] ?? entry.tag) : "";
    let notePath: string | null = null;
    if (entry.note) {
      notePath = options.resolveNote(entry.note);
      if (notePath === null) notesDropped += 1;
    }
    const id = `forest-${entry.start.toString(36)}-${fnv(`${entry.start}|${entry.end}|${entry.tag}|${entry.tree}`)}`;
    revisions.push({
      schema: 1,
      id,
      sessionId: id,
      parents: [],
      startedAt: entry.start,
      updatedAt: entry.end,
      durationMs: entry.end - entry.start,
      breakMs: options.breakMs,
      autoBreak: false,
      phase: "done",
      status: "completed",
      deadline: null,
      remainingMs: 0,
      focusEndedAt: entry.end,
      intervals: [{ start: entry.start, end: entry.end }],
      tags: normalizeTags(mapped ? [mapped] : []),
      notePath,
      crop: mapping.trees[entry.tree] ?? CROP_IDS[0],
    });
  }
  return { revisions, failed, notesDropped };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function summarizeForestImport(result: ForestImportResult): string {
  const { imported } = result;
  const parts: string[] = [];
  if (imported.added > 0)
    parts.push(`Imported ${plural(imported.added, "session", "sessions")} from Forest.`);
  else parts.push("Nothing new to import.");
  if (imported.duplicates > 0)
    parts.push(`${plural(imported.duplicates, "session was", "sessions were")} already here.`);
  if (result.failed > 0)
    parts.push(`${plural(result.failed, "stopped session was", "stopped sessions were")} skipped.`);
  if (result.invalidRows > 0)
    parts.push(`${plural(result.invalidRows, "row", "rows")} could not be read.`);
  if (result.notesDropped > 0)
    parts.push(
      `${plural(result.notesDropped, "note did", "notes did")} not match a note in your vault and ${result.notesDropped === 1 ? "was" : "were"} left out.`,
    );
  return parts.join(" ");
}
