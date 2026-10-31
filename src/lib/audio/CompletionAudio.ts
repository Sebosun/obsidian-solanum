import { COMPLETION_CHIME } from "@/lib/audio/constants";

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

  play(volume: number) {
    const context = this.context;
    if (!context || context.state !== "running" || volume <= 0) return;
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

  close() {
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
