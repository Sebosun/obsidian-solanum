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
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.16;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.7);
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
