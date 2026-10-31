import { isRevision } from "@/lib/storage/validation";
import type { Revision } from "@/lib/timer/types";
import type { ImportResult } from "@/lib/storage/SessionExchange";
import { describeDocuments } from "@/lib/notes/DayNoteWriter";

export const EXPORT_FORMAT = "solanum-sessions";
export const EXPORT_VERSION = 1;
export const EXPORT_FOLDER = "Solanum/exports";

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  sessions: Revision[];
}

export interface ParsedExport {
  revisions: Revision[];
  /** Entries that are not valid session revisions. */
  invalid: number;
}

const NOT_AN_EXPORT = "This is not a valid Solanum export file.";

/** Real history only, in a stable order so identical data produces identical files. */
export function buildExport(revisions: Revision[], now: number): ExportBundle {
  const sessions = revisions
    .filter((revision) => revision.source === undefined)
    .sort(
      (a, b) =>
        a.startedAt - b.startedAt ||
        a.sessionId.localeCompare(b.sessionId) ||
        a.updatedAt - b.updatedAt ||
        a.id.localeCompare(b.id),
    );
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    sessions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads an export bundle, a bare list of revisions, or a single revision file. */
export function parseExport(text: string): ParsedExport {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(NOT_AN_EXPORT);
  }
  let entries: unknown[];
  if (Array.isArray(value)) {
    entries = value;
  } else if (isRecord(value) && value.format === EXPORT_FORMAT) {
    if (typeof value.version === "number" && value.version > EXPORT_VERSION)
      throw new Error(
        `This export was made by a newer version of Solanum (format version ${value.version}). Update the plugin to import it.`,
      );
    entries = Array.isArray(value.sessions) ? value.sessions : [];
  } else if (isRevision(value)) {
    entries = [value];
  } else {
    throw new Error(NOT_AN_EXPORT);
  }
  const revisions = entries.filter(isRevision);
  return { revisions, invalid: entries.length - revisions.length };
}

/** JSON with sorted keys, so equal revisions compare equal whatever their key order. Like JSON, it ignores undefined values. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** One short, readable line (or two) for the notice shown after an import. */
export function summarizeImport(result: ImportResult): string {
  const parts: string[] = [];
  if (result.added > 0) parts.push(`Imported ${plural(result.added, "revision", "revisions")}.`);
  else if (result.duplicates === 0) parts.push("Nothing new to import.");
  else
    parts.push(
      `Nothing new to import. ${plural(result.duplicates, "revision was", "revisions were")} already here.`,
    );
  if (result.added > 0 && result.duplicates > 0)
    parts.push(`${plural(result.duplicates, "revision was", "revisions were")} already here.`);
  const clashes = result.conflicts.length;
  if (clashes === 1) parts.push("1 revision differs from your copy and was kept as is.");
  else if (clashes > 1)
    parts.push(`${clashes} revisions differ from your copies and were kept as is.`);
  if (result.invalid > 0)
    parts.push(`${plural(result.invalid, "entry was", "entries were")} not valid sessions.`);
  if (result.synthetic > 0)
    parts.push(
      `${plural(result.synthetic, "demo or debug entry was", "demo or debug entries were")} ignored.`,
    );
  if (result.documents) parts.push(describeDocuments(result.documents));
  return parts.join(" ");
}
