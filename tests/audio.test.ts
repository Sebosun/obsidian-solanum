import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { CompletionAudio } from "@/lib/audio/CompletionAudio";

interface FrequencyStub {
  value: number;
}
interface OscillatorStub {
  type: string;
  frequency: FrequencyStub;
  connect: Mock;
  disconnect: Mock;
  start: Mock;
  stop: Mock;
  onended: (() => void) | null;
}
interface EnvelopeStub {
  setValueAtTime: Mock;
  linearRampToValueAtTime: Mock;
  exponentialRampToValueAtTime: Mock;
}
interface GainStub {
  gain: EnvelopeStub;
  connect: Mock;
  disconnect: Mock;
}

class AudioContextStub {
  static instance: AudioContextStub;
  state = "running";
  currentTime = 10;
  destination = {};
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  oscillators: OscillatorStub[] = [];
  gains: GainStub[] = [];
  constructor() {
    AudioContextStub.instance = this;
  }
  createOscillator(): OscillatorStub {
    const node = {
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    this.oscillators.push(node);
    return node;
  }
  createGain(): GainStub {
    const node = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    this.gains.push(node);
    return node;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("completion audio scheduling", () => {
  it("schedules the chime envelope and disconnects finished nodes", () => {
    vi.stubGlobal("AudioContext", AudioContextStub);
    const audio = new CompletionAudio();
    audio.unlock();
    audio.play(0);
    expect(AudioContextStub.instance.oscillators).toHaveLength(0);
    audio.play(1);
    const { oscillators, gains } = AudioContextStub.instance;
    expect(oscillators.map((node) => node.frequency.value)).toEqual([
      523.25, 659.25, 783.99, 1046.5,
    ]);
    expect(oscillators[0].start).toHaveBeenCalledWith(10);
    expect(oscillators[1].start).toHaveBeenCalledWith(10.2);
    expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, 10.02);
    expect(oscillators[0].stop).toHaveBeenCalledWith(11.9);
    // Each note starts 0.2 s after the last and the final one rings for 1.9 s: about 2.5 s in all.
    const endsAt = Math.max(...oscillators.map((node) => node.stop.mock.calls[0][0] as number));
    expect(endsAt - 10).toBeCloseTo(2.5, 5);
    oscillators[0].onended?.();
    expect(oscillators[0].disconnect).toHaveBeenCalledOnce();
    expect(gains[0].disconnect).toHaveBeenCalledOnce();
    audio.close();
    expect(AudioContextStub.instance.close).toHaveBeenCalledOnce();
  });
});
