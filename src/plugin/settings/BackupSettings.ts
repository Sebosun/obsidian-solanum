import { Notice, Setting } from "obsidian";
import { summarizeImport } from "@/lib/storage/exchange";
import { pickTextFile } from "@/plugin/pickTextFile";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

/** Moving the whole session history in and out as a file. */
export function displayBackupSettings(context: SettingsContext): void {
  const { containerEl, services } = context;
  addHeading(context, "Backup");

  new Setting(containerEl)
    .setName("Export sessions")
    .setDesc("Save your whole session history to one file in the vault.")
    .addButton((control) => {
      control.setButtonText("Export").onClick(async function exportSessions() {
        try {
          const { path, count } = await services.exportSessions();
          new Notice(`Exported ${count} revisions to ${path}`);
        } catch (error) {
          context.reportError(error);
        }
      });
    });
  new Setting(containerEl)
    .setName("Import sessions")
    .setDesc("Merge sessions from an export file. Existing sessions are never overwritten.")
    .addButton((control) => {
      control.setButtonText("Import…").onClick(async function importSessions() {
        try {
          const text = await pickTextFile();
          if (text === null) return;
          new Notice(summarizeImport(await services.importSessions(text)), 10_000);
        } catch (error) {
          context.reportError(error);
        }
      });
    });
}
