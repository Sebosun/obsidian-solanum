import type { StoreApi } from "zustand/vanilla";
import type { SolanumHost, Action } from "@/types/host";
import type { TimerDraft } from "@/types/timer-ui";
import type { TimerState } from "@/lib/timer/types";
import type { CropId } from "@/lib/crops/catalog";
import type { SeasonChoice } from "@/lib/scene/seasons";

export interface HarvestCelebration {
  id: string;
  sessionId: string;
  crop: CropId;
  claimed: boolean;
}

export interface AppState extends TimerState {
  services: SolanumHost;
  draft: TimerDraft;
  selectedSessionId: string | null;
  revealedRevisionId: string | null;
  busy: boolean;
  error: string;
  celebration: HarvestCelebration | null;
  season: SeasonChoice;
  presets: number[];
  activeViews: number;
  registerView(): () => void;
  claimCelebration(id: string): boolean;
  run: Action;
  startFocus(): Promise<void>;
  updateDraft(patch: Partial<TimerDraft>): void;
  setSeason(season: SeasonChoice): void;
  setPresets(presets: number[], defaultMinutes: number): void;
  selectSession(id: string): void;
  revealControls(id: string): void;
  hideControls(): void;
  clearError(): void;
}

export type AppStore = StoreApi<AppState>;
