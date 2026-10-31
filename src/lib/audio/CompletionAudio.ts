import { COMPLETION_CHIME, MAX_CLIP_SECONDS } from "@/lib/audio/constants";

/** A local synthesized chime: no network request or third-party audio license. */
export class CompletionAudio {
  private context: AudioContext | null = null;

  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Visual notices remain available without Web Audio. */
    }
  }

  /** Decodes file data for `play`; null when the data is not audio the browser understands. */
  async decode(data: ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      this.context ??= new AudioContext();
      return await this.context.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  /** Plays `clip` when given, otherwise the built-in chime. */
  play(volume: number, clip: AudioBuffer | null = null) {
    const context = this.context;
    if (!context || context.state !== "running" || volume <= 0) return;
    if (clip) {
      this.playClip(context, volume, clip);
      return;
    }
    COMPLETION_CHIME.frequenciesHz.forEach((frequency, index) => {
      const start = context.currentTime + index * COMPLETION_CHIME.noteSpacingSeconds;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        volume * COMPLETION_CHIME.peakGain,
        start + COMPLETION_CHIME.attackSeconds,
      );
      gain.gain.exponentialRampToValueAtTime(
        COMPLETION_CHIME.silentGain,
        start + COMPLETION_CHIME.releaseSeconds,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + COMPLETION_CHIME.noteDurationSeconds);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }

  private playClip(context: AudioContext, volume: number, clip: AudioBuffer) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = clip;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(context.currentTime, 0, Math.min(clip.duration, MAX_CLIP_SECONDS));
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  close() {
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
