import type { Revision } from "@/lib/timer/types";

export type SessionStatusLabel = "Growing" | "Harvested" | "Partial crop";

/** How a session reads to the user: still growing, fully harvested, or ended early. */
export function sessionStatus(session: Revision): SessionStatusLabel {
  if (session.focusEndedAt !== null) return "Harvested";
  if (session.status === "cancelled") return "Partial crop";
  return "Growing";
}
