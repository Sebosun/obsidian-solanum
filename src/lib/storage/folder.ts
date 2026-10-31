import { normalizeVaultPath } from "@/lib/storage/vaultPath";

export const DEFAULT_SESSION_FOLDER = "Solanum/sessions";
export const DEBUG_SESSION_FOLDER = "Solanum/debug-sessions";
export const DEFAULT_DAY_NOTES_FOLDER = "Solanum";
export const LEGACY_DAY_NOTES_FOLDER = "Solanum/days";

type FolderResult = { ok: true; folder: string } | { ok: false; reason: string };

export type SessionFolderResult = FolderResult;
export type DayNotesFolderResult = FolderResult;

function isInside(folder: string, parent: string): boolean {
  return folder === parent || folder.startsWith(`${parent}/`);
}

/** Normalizes a user-entered vault folder; an empty entry means `fallback`. */
function parseVaultFolder(input: string, fallback: string): FolderResult {
  const path = normalizeVaultPath(input);
  if (!path.ok) return path;
  if (path.segments.length === 0) return { ok: true, folder: fallback };
  const folder = path.segments.join("/");
  if (isInside(folder, DEBUG_SESSION_FOLDER))
    return { ok: false, reason: "That folder is reserved for debug sessions." };
  return { ok: true, folder };
}

export const parseSessionFolder = (input: string): SessionFolderResult =>
  parseVaultFolder(input, DEFAULT_SESSION_FOLDER);
export const parseDayNotesFolder = (input: string): DayNotesFolderResult =>
  parseVaultFolder(input, DEFAULT_DAY_NOTES_FOLDER);
