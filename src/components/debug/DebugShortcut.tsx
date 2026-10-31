import { useDebugFinish } from "@/hooks/useDebugFinish";
import { useServices } from "@/state/hooks";

/**
 * A small button to force-finish a simulated phase, for when the phase fills the view and the
 * debug panel is out of sight. Only in debug builds, and only while there is something to finish.
 */
export function DebugShortcut() {
  const host = useServices();
  const { current, busy, finish } = useDebugFinish();
  if (!host.debug?.config.enabled || !current) return null;
  return (
    <button className="solanum-debug-shortcut" disabled={busy} onClick={finish}>
      Finish {current.phase} now
    </button>
  );
}
