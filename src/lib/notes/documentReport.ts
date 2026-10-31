export type DayNoteOutcome = "created" | "updated" | "unchanged" | "empty";

export interface DayNoteTotals {
  created: number;
  updated: number;
  unchanged: number;
}

export interface DocumentWriteResult extends DayNoteTotals {
  failures: { path: string; reason: string }[];
}

export function describeDocumentTotals(totals: DayNoteTotals): string {
  return `Documents: ${totals.created} new, ${totals.updated} updated, ${totals.unchanged} unchanged.`;
}

export function describeDocuments(result: DocumentWriteResult): string {
  let message = describeDocumentTotals(result);
  if (result.failures.length > 0)
    message += ` ${result.failures.length} failed. Session history is safe. Retry the import or use “Write documents for all history”. ${result.failures[0].reason}`;
  return message;
}
