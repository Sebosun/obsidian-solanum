import { useState, type ChangeEvent } from "react";
import { useDebugFinish } from "@/hooks/useDebugFinish";
import { useAppStore, useServices } from "@/state/hooks";

export function DebugPanel() {
  const host = useServices();
  const act = useAppStore((state) => state.run);
  const busy = useAppStore((state) => state.busy);
  const { current, finish } = useDebugFinish();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  if (!host.debug?.config.enabled) return null;
  function changeMonth(event: ChangeEvent<HTMLInputElement>) {
    setMonth(event.target.value);
  }
  async function seedMonth() {
    const [year, index] = month.split("-").map(Number);
    await host.debug?.seed(new Date(year, index - 1, 1), host.notes());
  }
  function handleSeed() {
    void act(seedMonth);
  }
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
        <input type="month" value={month} onChange={changeMonth} />
      </label>
      <button disabled={busy || !/^\d{4}-\d{2}$/.test(month)} onClick={handleSeed}>
        Seed demo harvests
      </button>
      {current && (
        <button disabled={busy} onClick={finish}>
          Finish {current.phase} now
        </button>
      )}
    </details>
  );
}
