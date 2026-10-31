import { MAX_CLIP_BYTES } from "@/lib/audio/constants";

export interface SoundDecoder {
  decode(data: ArrayBuffer): Promise<AudioBuffer | null>;
}

type Problem = (path: string, reason: string) => void;

/** Decodes vault audio files once and remembers the result, including failures. */
export class SoundLibrary {
  private clips = new Map<string, Promise<AudioBuffer | null>>();

  constructor(
    private decoder: SoundDecoder,
    private read: (path: string) => Promise<ArrayBuffer>,
    private onProblem: Problem,
  ) {}

  load(path: string): Promise<AudioBuffer | null> {
    let clip = this.clips.get(path);
    if (!clip) {
      clip = this.fetch(path);
      this.clips.set(path, clip);
    }
    return clip;
  }

  /** Forget a file so the next use reads it again; call when it changes in the vault. */
  invalidate(path: string): void {
    this.clips.delete(path);
  }

  private async fetch(path: string): Promise<AudioBuffer | null> {
    let data: ArrayBuffer;
    try {
      data = await this.read(path);
    } catch {
      this.onProblem(path, "The file could not be read.");
      return null;
    }
    if (data.byteLength > MAX_CLIP_BYTES) {
      this.onProblem(path, "The file is too large for a notification sound.");
      return null;
    }
    const clip = await this.decoder.decode(data);
    if (!clip) this.onProblem(path, "This is not a supported audio file.");
    return clip;
  }
}
