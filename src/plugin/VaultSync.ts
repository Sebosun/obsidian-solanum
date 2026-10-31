/** After a burst of vault events settles this long, the history is reloaded once. */
export const SYNC_DEBOUNCE_MS = 500;
/** Adapter writes and some sync providers emit no vault event, so the history is also polled. */
export const SYNC_POLL_MS = 15_000;

export interface VaultSyncPorts {
  /** The folders whose files make up the session history. */
  folders(): string[];
  /** Reloads the history; failures are the caller's to report. */
  refresh(): void;
}

/** Turns vault file events inside the history folders into one debounced refresh. */
export class VaultSync {
  private timer: number | null = null;
  private disposed = false;

  constructor(private ports: VaultSyncPorts) {}

  /** Call for every created, modified, or deleted vault path. */
  onVaultChange(path: string): void {
    if (this.disposed) return;
    if (!this.ports.folders().some((folder) => path.startsWith(`${folder}/`))) return;
    this.cancel();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.ports.refresh();
    }, SYNC_DEBOUNCE_MS);
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
  }

  private cancel(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}
