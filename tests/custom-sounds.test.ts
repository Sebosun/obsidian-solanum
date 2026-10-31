import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { parseSoundPath } from "@/lib/audio/soundPath";
import { SoundLibrary, type SoundDecoder } from "@/lib/audio/SoundLibrary";
import { CompletionAudio } from "@/lib/audio/CompletionAudio";
import { MAX_CLIP_BYTES, MAX_CLIP_SECONDS } from "@/lib/audio/constants";
import { DEFAULT_SETTINGS, readSettings } from "@/lib/settings";

describe("custom sound paths", () => {
  it.each([
    ["Sounds/ding.mp3", "Sounds/ding.mp3"],
    ["  /Assets/Audio/Gong.WAV ", "Assets/Audio/Gong.WAV"],
    ["bell.ogg", "bell.ogg"],
    ["a//b/c.m4a", "a/b/c.m4a"],
    ["", ""],
    ["   ", ""],
  ])("accepts %j as %j", (input, path) => {
    expect(parseSoundPath(input)).toEqual({ ok: true, path });
  });

  it.each([
    ["notes/readme.md", /audio/i],
    ["Sounds/ding", /audio/i],
    ["../ding.mp3", /vault/i],
    [".obsidian/ding.mp3", /hidden/i],
    ["Sounds/.private/ding.mp3", /hidden/i],
    ["C:\\sounds\\ding.mp3", /valid/i],
  ])("rejects %j", (input, reason) => {
    const result = parseSoundPath(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it("stores the choice per phase and drops a corrupt value", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ focusSound: "", breakSound: "" });
    const settings = readSettings({ focusSound: "Sounds/a.mp3", breakSound: "../x.mp3" });
    expect(settings).toMatchObject({ focusSound: "Sounds/a.mp3", breakSound: "" });
    expect(readSettings({ focusSound: 9 }).focusSound).toBe("");
  });
});

const clip = (seconds: number) => ({ duration: seconds }) as AudioBuffer;
function library(
  options: { bytes?: number; decodes?: AudioBuffer | null; missing?: boolean } = {},
) {
  const read = vi.fn(async (path: string) => {
    if (options.missing) throw new Error(`ENOENT ${path}`);
    return new ArrayBuffer(options.bytes ?? 1024);
  });
  const decoder: SoundDecoder = {
    decode: vi.fn(async () => (options.decodes === undefined ? clip(1) : options.decodes)),
  };
  const problems: string[] = [];
  const sounds = new SoundLibrary(decoder, read, (path, reason) =>
    problems.push(`${path}: ${reason}`),
  );
  return { sounds, read, decoder, problems };
}

describe("sound library", () => {
  it("reads and decodes a file once, even for simultaneous requests", async () => {
    const { sounds, read, decoder } = library();
    const [a, b] = await Promise.all([sounds.load("Sounds/a.mp3"), sounds.load("Sounds/a.mp3")]);
    expect(a).toBe(b);
    await sounds.load("Sounds/a.mp3");
    expect(read).toHaveBeenCalledTimes(1);
    expect(decoder.decode).toHaveBeenCalledTimes(1);
  });

  it("decodes again after the file changes", async () => {
    const { sounds, read } = library();
    await sounds.load("Sounds/a.mp3");
    sounds.invalidate("Sounds/other.mp3");
    await sounds.load("Sounds/a.mp3");
    expect(read).toHaveBeenCalledTimes(1);
    sounds.invalidate("Sounds/a.mp3");
    await sounds.load("Sounds/a.mp3");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["is missing", { missing: true }, /could not be read/i],
    ["cannot be decoded", { decodes: null }, /not a supported audio/i],
    ["is too large", { bytes: MAX_CLIP_BYTES + 1 }, /too large/i],
  ])("falls back and reports once when the file %s", async (_name, options, reason) => {
    const { sounds, problems } = library(options);
    expect(await sounds.load("Sounds/a.mp3")).toBeNull();
    expect(await sounds.load("Sounds/a.mp3")).toBeNull();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(reason);
  });

  it("tries again after a problem file is replaced", async () => {
    const { sounds, problems } = library({ missing: true });
    await sounds.load("Sounds/a.mp3");
    sounds.invalidate("Sounds/a.mp3");
    await sounds.load("Sounds/a.mp3");
    expect(problems).toHaveLength(2);
  });
});

class SourceStub {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  onended: (() => void) | null = null;
}
class ClipContextStub {
  static instance: ClipContextStub;
  state = "running";
  currentTime = 4;
  destination = {};
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  sources: SourceStub[] = [];
  gainValues: number[] = [];
  oscillators = 0;
  decodeAudioData = vi.fn(async (data: ArrayBuffer) => clip(data.byteLength / 100));
  constructor() {
    ClipContextStub.instance = this;
  }
  createBufferSource() {
    const source = new SourceStub();
    this.sources.push(source);
    return source;
  }
  createGain() {
    const gain = { value: 0 };
    const node = { gain, connect: vi.fn(), disconnect: vi.fn() };
    this.gainValues.push(0);
    const index = this.gainValues.length - 1;
    Object.defineProperty(gain, "value", {
      get: () => this.gainValues[index],
      set: (value: number) => {
        this.gainValues[index] = value;
      },
    });
    return node;
  }
  createOscillator() {
    this.oscillators += 1;
    throw new Error("the built-in chime must not play for a custom clip");
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("playing a custom clip", () => {
  function setup() {
    vi.stubGlobal("AudioContext", ClipContextStub);
    const audio = new CompletionAudio();
    audio.unlock();
    return audio;
  }

  it("plays the clip at the chosen volume instead of the chime", () => {
    const audio = setup();
    const buffer = clip(2);
    audio.play(0.5, buffer);
    const { sources, gainValues, oscillators } = ClipContextStub.instance;
    expect(oscillators).toBe(0);
    expect(sources).toHaveLength(1);
    expect(sources[0].buffer).toBe(buffer);
    expect(sources[0].start).toHaveBeenCalledWith(4, 0, 2);
    expect(gainValues).toEqual([0.5]);
  });

  it("cuts a long clip short and cleans up when it ends", () => {
    const audio = setup();
    audio.play(1, clip(120));
    const [source] = ClipContextStub.instance.sources;
    expect((source.start as Mock).mock.calls[0][2]).toBe(MAX_CLIP_SECONDS);
    source.onended?.();
    expect(source.disconnect).toHaveBeenCalled();
  });

  it("stays silent at zero volume or before the browser allows audio", () => {
    const audio = setup();
    audio.play(0, clip(1));
    ClipContextStub.instance.state = "suspended";
    audio.play(1, clip(1));
    expect(ClipContextStub.instance.sources).toHaveLength(0);
  });

  it("decodes file data with the shared audio context", async () => {
    const audio = setup();
    const decoded = await audio.decode(new ArrayBuffer(500));
    expect(decoded?.duration).toBe(5);
    vi.stubGlobal(
      "AudioContext",
      class {
        decodeAudioData = async () => {
          throw new Error("EncodingError");
        };
      },
    );
    expect(await new CompletionAudio().decode(new ArrayBuffer(1))).toBeNull();
  });
});
