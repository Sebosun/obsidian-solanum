import type { MouseEvent } from "react";
import { useAppStore, useServices } from "../../state/hooks";

export function SyncConflicts() {
  const services = useServices();
  const conflicts = useAppStore((state) => state.conflicts);
  const busy = useAppStore((state) => state.busy);
  const run = useAppStore((state) => state.run);
  function chooseVersion(event: MouseEvent<HTMLButtonElement>) {
    const { session, revision } = event.currentTarget.dataset;
    if (!session || !revision) return;
    const selection = { session, revision };
    async function resolveConflict() {
      await services.timer.resolve(selection.session, selection.revision);
    }
    void run(resolveConflict);
  }
  return (
    <>
      {conflicts.map((conflict) => (
        <section key={conflict.sessionId} className="solanum-warning">
          <strong>Choose a synced version</strong>
          {conflict.versions.map((version) => (
            <button
              key={version.id}
              disabled={busy}
              data-session={version.sessionId}
              data-revision={version.id}
              onClick={chooseVersion}
            >
              {version.phase} / {version.status} · {new Date(version.updatedAt).toLocaleString()}
            </button>
          ))}
        </section>
      ))}
    </>
  );
}
