import type { TimerService } from "@/lib/timer/TimerService";
import type { SessionStore } from "@/lib/timer/types";
import type { DebugConfig } from "@/lib/debug/config";
import { seedMonth } from "@/lib/debug/seeder";
import { MS_PER_SECOND } from "@/lib/time";

export class DebugTools {
  constructor(
    private timer: TimerService,
    private store: SessionStore,
    readonly config: DebugConfig,
    private now = Date.now,
  ) {}

  async seed(month: Date, notes: string[] = []) {
    if (!this.config.enabled) throw new Error("Debug mode is disabled.");
    const existing = new Set((await this.store.readAll()).map((r) => r.id));
    for (const revision of seedMonth(month, this.now(), notes)) {
      if (!existing.has(revision.id)) await this.store.append(revision);
    }
    await this.timer.refresh();
  }

  async tick() {
    if (!this.config.enabled || !this.config.autoFinishSeconds) return;
    for (const s of this.timer.getState().sessions) {
      if (
        s.source === "debug" &&
        s.status === "running" &&
        this.now() - s.updatedAt >= this.config.autoFinishSeconds * MS_PER_SECOND &&
        !this.timer.getState().conflicts.some((c) => c.sessionId === s.sessionId)
      ) {
        await this.timer.debugFinish(s.sessionId);
      }
    }
  }
}
