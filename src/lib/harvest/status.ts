import type { Revision } from "@/lib/timer/types";

export type SessionStatusLabel = "Growing" | "Harvested" | "Stopped";

/** How a session reads to the user. Stopped crops are not shown anywhere; this is a safe label. */
export function sessionStatus(session: Revision): SessionStatusLabel {
  if (session.focusEndedAt !== null) return "Harvested";
  if (session.status === "cancelled") return "Stopped";
  return "Growing";
}
