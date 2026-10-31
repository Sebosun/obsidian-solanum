import type { TimerService } from "./timer";
import type { DebugTools } from "./lib/debug/DebugTools";

export interface Settings {
  defaultMinutes: number;
  breakMinutes: number;
  autoBreak: boolean;
  sound: boolean;
  volume: number;
}

export const PRESETS = [5, 10, 25, 50, 60, 90, 120];
export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: 25, breakMinutes: 5, autoBreak: false, sound: true, volume: .4,
};

export function readSettings(value: unknown): Settings {
  const s = (value && typeof value === "object" ? value : {}) as Partial<Settings>;
  return {
    defaultMinutes: PRESETS.includes(s.defaultMinutes!) ? s.defaultMinutes! : 25,
    breakMinutes: Number.isFinite(s.breakMinutes) && s.breakMinutes! >= 1 && s.breakMinutes! <= 1440 ? s.breakMinutes! : 5,
    autoBreak: typeof s.autoBreak === "boolean" ? s.autoBreak : false,
    sound: typeof s.sound === "boolean" ? s.sound : true,
    volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume!)) : .4,
  };
}

export interface SolanumHost {
  timer: TimerService;
  debug?: DebugTools;
  settings: Settings;
  saveSettings(settings: Settings): Promise<void>;
  tags(): string[];
  notes(): string[];
  activeNote(): string | null;
  openNote(path: string): void;
  assetUrl(name: string): string;
  navigate(screen: "timer" | "harvest"): void;
  unlockAudio(): void;
  previewSound(): void;
}
