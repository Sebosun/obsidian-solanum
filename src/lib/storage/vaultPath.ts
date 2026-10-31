export type VaultPathResult = { ok: true; segments: string[] } | { ok: false; reason: string };

const INVALID_CHARACTERS = /[\\:*?"<>|]/;

/** Splits a user-entered path into clean segments, or explains why it cannot live in the vault. */
export function normalizeVaultPath(input: string): VaultPathResult {
  const trimmed = input.trim();
  if (INVALID_CHARACTERS.test(trimmed))
    return { ok: false, reason: "Use a valid vault path with forward slashes." };
  const segments = trimmed.split("/").filter((segment) => segment !== "");
  if (segments.some((segment) => segment === "." || segment === ".."))
    return { ok: false, reason: "The path must stay inside the vault." };
  if (segments.some((segment) => segment.startsWith(".")))
    return { ok: false, reason: "Hidden folders are not allowed; Obsidian does not index them." };
  return { ok: true, segments };
}
