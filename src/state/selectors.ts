import { isActive } from "../lib/timer/selectors";
import type { AppState } from "./types";

export function selectCurrentSession(state: AppState) {
  const active = state.sessions.filter(isActive);
  return active.find((session) => session.sessionId === state.selectedSessionId) ?? active[0];
}
