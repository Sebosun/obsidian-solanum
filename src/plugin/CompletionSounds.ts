import { CompletionAudio } from "@/lib/audio/CompletionAudio";
import { SoundLibrary } from "@/lib/audio/SoundLibrary";
import type { Settings } from "@/lib/settings";
import type { CompletionPhase } from "@/types/host";

const SOUND_KEYS = ["focusSound", "breakSound"] as const;

/** The sound played when a phase ends: the user's file from the vault, or the built-in chime. */
export class CompletionSounds {
  private audio = new CompletionAudio();
  private library: SoundLibrary;

  constructor(
    readBinary: (path: string) => Promise<ArrayBuffer>,
    warn: (path: string, reason: string) => void,
  ) {
    this.library = new SoundLibrary(this.audio, readBinary, warn);
  }

  /** Browsers only start audio after a user gesture. */
  unlock(): void {
    this.audio.unlock();
  }

  close(): void {
    this.audio.close();
  }

  /** A file changed in the vault, so any decoded copy is stale. */
  invalidate(path: string): void {
    this.library.invalidate(path);
  }

  /** Drops the old files and decodes the new ones now, so a bad file is reported in settings. */
  settingsChanged(previous: Settings, next: Settings): void {
    for (const key of SOUND_KEYS) {
      if (next[key] === previous[key]) continue;
      if (previous[key]) this.library.invalidate(previous[key]);
      if (next[key]) void this.library.load(next[key]);
    }
  }

  async play(phase: CompletionPhase, settings: Settings, preview = false): Promise<void> {
    if (!settings.sound && !preview) return;
    const path = phase === "focus" ? settings.focusSound : settings.breakSound;
    const clip = path ? await this.library.load(path) : null;
    this.audio.play(settings.volume, clip);
  }
}
