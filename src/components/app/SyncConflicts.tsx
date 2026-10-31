import type { TimerState } from "../../lib/timer/types";
import type { Action, SolanumHost } from "../../types/host";

export function SyncConflicts({
  conflicts,
  host,
  act,
  busy,
}: {
  conflicts: TimerState["conflicts"];
  host: SolanumHost;
  act: Action;
  busy: boolean;
}) {
  return (
    <>
      {conflicts.map((conflict) => (
        <section key={conflict.sessionId} className="solanum-warning">
          <strong>Sync conflict — choose a version</strong>
          <p>Both edits are preserved. Automatic transitions are suspended until you choose.</p>
          {conflict.versions.map((s) => (
            <button
              disabled={busy}
              key={s.id}
              onClick={() => void act(() => host.timer.resolve(s.sessionId, s.id))}
            >
              Keep {s.phase} / {s.status} · {new Date(s.updatedAt).toLocaleString()} ·{" "}
              {s.id.slice(0, 8)}
            </button>
          ))}
        </section>
      ))}
    </>
  );
}
