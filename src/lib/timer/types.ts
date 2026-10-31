import type { CropId } from "../crops/catalog";

export type Phase = "focus" | "break" | "done";
export type Status = "running" | "paused" | "waiting" | "completed" | "cancelled";

export interface CompletionEvent {
  sessionId: string;
  crop: CropId;
  phase: "focus" | "break";
  at: number;
}

export interface Revision {
  schema: 1;
  id: string;
  sessionId: string;
  parents: string[];
  startedAt: number;
  updatedAt: number;
  durationMs: number;
  breakMs: number;
  autoBreak: boolean;
  phase: Phase;
  status: Status;
  deadline: number | null;
  remainingMs: number;
  focusEndedAt: number | null;
  intervals: { start: number; end: number | null }[];
  tags: string[];
  notePath: string | null;
  crop: CropId;
  source?: "debug" | "seed";
}

export interface SessionStore {
  readAll(): Promise<Revision[]>;
  append(revision: Revision): Promise<void>;
}

export interface StartOptions {
  durationMs: number;
  breakMs: number;
  autoBreak: boolean;
  tags: string[];
  notePath: string | null;
  crop?: CropId;
}

export interface TimerState {
  sessions: Revision[];
  conflicts: { sessionId: string; versions: Revision[] }[];
}
