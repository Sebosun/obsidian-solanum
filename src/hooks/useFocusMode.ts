import { useEffect, useState } from "react";
import type { Revision } from "../lib/timer/types";
import { isActive } from "../lib/timer/selectors";
import type { Screen } from "../types/host";

export function useFocusMode(sessions: Revision[], screen: Screen, blocked: boolean) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const active = sessions.filter(isActive);
  // Multiple offline crops need visible reconciliation controls, never an immersive trap.
  const session =
    screen === "timer" &&
    active.length === 1 &&
    active[0].phase === "focus" &&
    active[0].status === "running"
      ? active[0]
      : undefined;
  const id = session?.id;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && id) setRevealed(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);
  return {
    session,
    immersive: !!session && revealed !== id && !blocked,
    reveal: () => {
      if (id) setRevealed(id);
    },
    hide: () => setRevealed(null),
  };
}
