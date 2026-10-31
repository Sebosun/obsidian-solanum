/**
 * Sessions an import is adding right now. Their documents are written once, by the import, so the
 * live document updates skip them. Imports may overlap, so each session id is counted.
 */
export class ImportTracker {
  private active = new Map<string, number>();

  isImporting(sessionId: string): boolean {
    return this.active.has(sessionId);
  }

  /** Marks the sessions as importing for as long as `work` runs, even if it fails. */
  async track<T>(sessionIds: Iterable<string>, work: () => Promise<T>): Promise<T> {
    const ids = [...sessionIds];
    for (const id of ids) this.active.set(id, (this.active.get(id) ?? 0) + 1);
    try {
      return await work();
    } finally {
      for (const id of ids) this.release(id);
    }
  }

  private release(id: string): void {
    const remaining = (this.active.get(id) ?? 1) - 1;
    if (remaining === 0) this.active.delete(id);
    else this.active.set(id, remaining);
  }
}
