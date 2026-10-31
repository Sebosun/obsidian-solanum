import type { App } from "obsidian";
import type { DayNoteMigrationPlan } from "@/lib/notes/migration";
import { confirmMove } from "@/plugin/ConfirmMoveModal";

const MIGRATION_PREVIEW_MAX_PATHS = 10;

/** Confirms physical document moves before an import, without exposing layout modes. */
export function confirmDocumentOrganization(
  app: App,
  plan: DayNoteMigrationPlan,
): Promise<boolean> {
  if (plan.conflicts.length > 0)
    throw new Error(`Documents already exist at ${plan.conflicts.join(", ")}. Nothing was moved.`);
  const paths = plan.moves
    .slice(0, MIGRATION_PREVIEW_MAX_PATHS)
    .map((move) => `${move.from} → ${move.to}`)
    .join("\n");
  let message = `Move ${plan.moves.length} documents from ${plan.from} into ${plan.to}/YYYY/MM/. All session documents use this layout. ${plan.leftBehind.length} unrelated files stay where they are.\n\n${paths}`;
  if (plan.moves.length > MIGRATION_PREVIEW_MAX_PATHS)
    message += `\n… and ${plan.moves.length - MIGRATION_PREVIEW_MAX_PATHS} more.`;
  return confirmMove(app, message, { title: "Organize documents?", button: "Move documents" });
}
