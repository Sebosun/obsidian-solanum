import type { TimerService } from "@/lib/timer/TimerService";
import type { DebugTools } from "@/lib/debug/DebugTools";
import type { Settings } from "@/lib/settings";
import type { MovePlan, MoveResult } from "@/lib/storage/migration";
import type { ExportResult, ImportResult } from "@/lib/storage/SessionExchange";

export type CompletionPhase = "focus" | "break";
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
  /** Plays the completion sound for a phase, as it would sound when that phase ends. */
  previewSound(phase?: CompletionPhase): void;
  openSettings(): void;
}

/** Session-folder changes, used only by the settings tab. */
export interface SessionFolderPort {
  /** What moving sessions to `folder` would do; changes nothing. */
  planSessionFolder(folder: string): Promise<MovePlan>;
  /** Moves existing sessions into `folder`, then makes it the saved session folder. */
  moveSessionFolder(folder: string): Promise<MoveResult>;
}

/** Backup and restore of the whole session history, used only by the settings tab. */
export interface SessionExchangePort {
  exportSessions(): Promise<ExportResult>;
  importSessions(text: string): Promise<ImportResult>;
}
