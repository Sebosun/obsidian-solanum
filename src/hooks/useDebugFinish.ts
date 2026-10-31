import { useAppStore, useServices } from "@/state/hooks";

/** The simulated session that is running, if any, and a way to force-finish its phase. */
export function useDebugFinish() {
  const host = useServices();
  const act = useAppStore((state) => state.run);
  const busy = useAppStore((state) => state.busy);
  const sessions = useAppStore((state) => state.sessions);
  const current = sessions.find(
    (session) => session.source === "debug" && session.phase !== "done",
  );
  async function finishPhase() {
    if (current) await host.timer.debugFinish(current.sessionId);
  }
  function finish() {
    void act(finishPhase);
  }
  return { current, busy, finish };
}
