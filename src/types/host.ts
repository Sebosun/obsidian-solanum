import type { TimerService } from "../lib/timer/TimerService";
import type { DebugTools } from "../lib/debug/DebugTools";
import type { Settings } from "../lib/settings";

export type Screen = "timer" | "harvest";
export type Action = (action: () => Promise<unknown>) => Promise<void>;

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
  readAsset?(name: string): Promise<ArrayBuffer>;
  navigate(screen: Screen): void;
  unlockAudio(): void;
  previewSound(): void;
  openSettings(): void;
}
