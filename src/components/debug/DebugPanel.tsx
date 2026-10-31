import { useState } from "react";
import type { SolanumHost } from "../../types/host";

export function DebugPanel({
  host,
  act,
  busy,
}: {
  host: SolanumHost;
  act: (action: () => Promise<unknown>) => Promise<void>;
  busy: boolean;
}) {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  if (!host.debug?.config.enabled) return null;
  const current = host.timer
    .getState()
    .sessions.find((s) => s.source === "debug" && s.phase !== "done");
  return (
    <details className="solanum-warning">
      <summary>Debug tools · simulated data</summary>
      <p>
        Debug crops and seeded history are stored separately, hidden in production. Force-finish
        records actual elapsed time.
      </p>
      <p>
        Auto-finish:{" "}
        {host.debug.config.autoFinishSeconds
          ? `${host.debug.config.autoFinishSeconds}s per phase`
          : "off"}
        .
      </p>
      <label className="solanum-field">
        Seed month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>
      <button
        disabled={busy || !/^\d{4}-\d{2}$/.test(month)}
        onClick={() =>
          void act(async () => {
            const [year, index] = month.split("-").map(Number);
            await host.debug!.seed(new Date(year, index - 1, 1), host.notes());
          })
        }
      >
        Seed demo harvests
      </button>
      {current && (
        <button
          disabled={busy}
          onClick={() => void act(() => host.timer.debugFinish(current.sessionId))}
        >
          Finish {current.phase} now
        </button>
      )}
    </details>
  );
}
