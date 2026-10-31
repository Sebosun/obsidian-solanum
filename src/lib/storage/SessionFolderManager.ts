import {
  moveSessions,
  planSessionMove,
  type MigrationAdapter,
  type MovePlan,
  type MoveResult,
} from "@/lib/storage/migration";
import type { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import type { TimerService } from "@/lib/timer/TimerService";

/** Moves session files and switches the store, while the timer is paused from writing. */
export class SessionFolderManager {
  constructor(
    private adapter: MigrationAdapter,
    private store: VaultSessionStore,
    private timer: TimerService,
  ) {}

  get folder(): string {
    return this.store.folder;
  }

  plan(to: string): Promise<MovePlan> {
    return this.timer.exclusive(() => planSessionMove(this.adapter, this.store.folder, to));
  }

  /** The store only switches once every valid file is safely in `to`. */
  relocate(to: string): Promise<MoveResult> {
    return this.timer.exclusive(async () => {
      const result = await moveSessions(this.adapter, this.store.folder, to);
      this.store.setFolder(to);
      return result;
    });
  }
}
