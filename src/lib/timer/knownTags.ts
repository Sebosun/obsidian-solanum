import { normalizeTags } from "@/lib/timer/selectors";
import type { Revision } from "@/lib/timer/types";

/** Every tag worth suggesting: the vault's own, and any a session has used, each once. */
export function knownTags(vaultTags: string[], sessions: Pick<Revision, "tags">[]): string[] {
  return [...new Set([...vaultTags, ...sessions.flatMap((session) => session.tags)])];
}

/** What a note's tags would add to the `chosen` ones: only those not already chosen, cleaned. */
export function tagsToAdd(noteTags: string[], chosen: string[]): string[] {
  return normalizeTags(noteTags).filter((tag) => !chosen.includes(tag));
}
