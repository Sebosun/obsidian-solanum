import { Notice, Setting, type ButtonComponent } from "obsidian";
import { DEFAULT_SESSION_FOLDER, parseSessionFolder } from "@/lib/storage/folder";
import type { MovePlan } from "@/lib/storage/migration";
import { confirmMove } from "@/plugin/ConfirmMoveModal";
import { FolderSuggest } from "@/plugin/FolderSuggest";
import { plural } from "@/lib/text";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

const FOLDER_HELP = "Vault folder for session files. Changing it moves your existing sessions.";

function describeMove(from: string, to: string, plan: MovePlan): string {
  let message = `Move ${plural(plan.toMove, "session file")} from ${from} to ${to}.`;
  if (plan.alreadyThere > 0)
    message += ` ${plural(plan.alreadyThere, "file")} already in ${to} will be merged.`;
  if (plan.leftBehind.length > 0)
    message += ` ${plural(plan.leftBehind.length, "file")} that are not sessions will stay in ${from}.`;
  return message;
}

/** Where session files live. */
export function displaySessionStorageSettings(context: SettingsContext): void {
  const { app, host, services } = context;
  addHeading(context, "Sessions");

  let input = host.settings.sessionFolder;
  let moveButton: ButtonComponent | null = null;
  const setting = new Setting(context.containerEl).setName("Session folder").setDesc(FOLDER_HELP);

  function editFolder(value: string): void {
    input = value;
    const parsed = parseSessionFolder(value);
    if (!parsed.ok) {
      setting.setDesc(parsed.reason);
      moveButton?.setDisabled(true);
      return;
    }
    setting.setDesc(FOLDER_HELP);
    moveButton?.setDisabled(parsed.folder === host.settings.sessionFolder);
  }

  async function moveFolder(): Promise<void> {
    const parsed = parseSessionFolder(input);
    if (!parsed.ok) return;
    const from = host.settings.sessionFolder;
    try {
      const plan = await services.planSessionFolder(parsed.folder);
      if (plan.conflicts.length > 0)
        throw new Error(
          `${plural(plan.conflicts.length, "file")} in ${parsed.folder} would be overwritten with different content. Nothing was moved.`,
        );
      if (!(await confirmMove(app, describeMove(from, parsed.folder, plan)))) return;
      const result = await services.moveSessionFolder(parsed.folder);
      new Notice(`Moved ${plural(result.moved, "session file")} to ${parsed.folder}.`);
    } catch (error) {
      context.reportError(error);
    }
    context.refresh();
  }

  setting.addText((control) => {
    control.setPlaceholder(DEFAULT_SESSION_FOLDER).setValue(input);
    new FolderSuggest(app, control.inputEl);
    control.onChange(editFolder);
  });
  setting.addButton((control) => {
    control.setButtonText("Move sessions").setCta().setDisabled(true);
    control.onClick(moveFolder);
    moveButton = control;
  });
}
