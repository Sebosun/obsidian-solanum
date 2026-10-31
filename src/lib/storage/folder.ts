export const DEFAULT_SESSION_FOLDER = "Solanum/sessions";
export const DEBUG_SESSION_FOLDER = "Solanum/debug-sessions";

export type SessionFolderResult = { ok: true; folder: string } | { ok: false; reason: string };

const INVALID_CHARACTERS = /[\\:*?"<>|]/;

function isInside(folder: string, parent: string): boolean {
  return folder === parent || folder.startsWith(`${parent}/`);
}

/** Normalizes a user-entered vault folder, or explains why it cannot hold sessions. */
export function parseSessionFolder(input: string): SessionFolderResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true, folder: DEFAULT_SESSION_FOLDER };
  if (INVALID_CHARACTERS.test(trimmed))
    return { ok: false, reason: "Use a valid vault folder path with forward slashes." };
  const segments = trimmed.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return { ok: true, folder: DEFAULT_SESSION_FOLDER };
  if (segments.some((segment) => segment === "." || segment === ".."))
    return { ok: false, reason: "The folder must stay inside the vault." };
  if (segments.some((segment) => segment.startsWith(".")))
    return {
      ok: false,
      reason: "Hidden folders are not allowed; Obsidian does not index them.",
    };
  const folder = segments.join("/");
  if (isInside(folder, DEBUG_SESSION_FOLDER))
    return { ok: false, reason: "That folder is reserved for debug sessions." };
  return { ok: true, folder };
}
