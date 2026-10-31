import { isActive } from "@/lib/timer/selectors";
import type { Screen } from "@/types/host";
import { useAppStore } from "@/state/hooks";

/**
 * Whether the timer fills the view. It does for as long as one session is under way (running,
 * paused, or waiting for its break), since pause and stop sit inside the scene. Only a failure to
 * show, or a sync conflict to resolve, brings the rest of the interface back.
 */
export function useFocusMode(screen: Screen): boolean {
  const sessions = useAppStore((state) => state.sessions);
  const conflicts = useAppStore((state) => state.conflicts);
  const error = useAppStore((state) => state.error);
  const underWay = sessions.filter(isActive).length === 1;
  return screen === "timer" && underWay && !error && conflicts.length === 0;
}
