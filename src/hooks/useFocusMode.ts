import { useEffect } from "react";
import { isActive } from "@/lib/timer/selectors";
import type { Screen } from "@/types/host";
import { useAppStore } from "@/state/hooks";

export function useFocusMode(screen: Screen) {
  const sessions = useAppStore((state) => state.sessions);
  const conflicts = useAppStore((state) => state.conflicts);
  const error = useAppStore((state) => state.error);
  const revealed = useAppStore((state) => state.revealedRevisionId);
  const reveal = useAppStore((state) => state.revealControls);
  const hide = useAppStore((state) => state.hideControls);
  const active = sessions.filter(isActive);
  let id: string | undefined;
  if (
    screen === "timer" &&
    active.length === 1 &&
    active[0].phase === "focus" &&
    active[0].status === "running"
  ) {
    id = active[0].id;
  }
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && id) reveal(id);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [id, reveal]);
  const immersive = !!id && revealed !== id && !error && conflicts.length === 0;
  const onHide = id ? hide : undefined;
  return { immersive, onHide };
}
