import { normalizeVaultPath } from "@/lib/storage/vaultPath";

/** File types the Web Audio decoder handles in Obsidian's Chromium. */
export const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "aac",
  "flac",
  "opus",
  "webm",
] as const;

export type SoundPathResult = { ok: true; path: string } | { ok: false; reason: string };

export const isAudioPath = (path: string) =>
  AUDIO_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(`.${extension}`));

/** An empty value means "use the built-in chime". */
export function parseSoundPath(input: string): SoundPathResult {
  const path = normalizeVaultPath(input);
  if (!path.ok) return path;
  if (path.segments.length === 0) return { ok: true, path: "" };
  const normalized = path.segments.join("/");
  if (!isAudioPath(normalized))
    return { ok: false, reason: `Choose an audio file (${AUDIO_EXTENSIONS.join(", ")}).` };
  return { ok: true, path: normalized };
}
