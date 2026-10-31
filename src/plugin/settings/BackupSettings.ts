import { Notice, Setting } from "obsidian";
import {
  defaultForestMapping,
  parseForestCsv,
  previewForest,
  summarizeForestImport,
} from "@/lib/import/forest";
import { summarizeImport } from "@/lib/storage/exchange";
import { askForestMapping } from "@/plugin/ForestImportModal";
import { pickTextFile } from "@/plugin/pickTextFile";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

/** Moving the whole session history in and out as a file. */
export function displayBackupSettings(context: SettingsContext): void {
  const { app, containerEl, host, services } = context;
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

  new Setting(containerEl)
    .setName("Import from Forest")
    .setDesc(
      "Add the finished trees from a Forest CSV export. You choose which tag and which plant each one becomes.",
    )
    .addButton((control) => {
      control.setButtonText("Choose CSV…").onClick(async function importForest() {
        try {
          const text = await pickTextFile(".csv,text/csv");
          if (text === null) return;
          const preview = previewForest(parseForestCsv(text));
          if (preview.successful === 0) {
            new Notice("That Forest export has no finished sessions to import.");
            return;
          }
          const mapping = await askForestMapping(
            app,
            preview,
            defaultForestMapping(preview),
            host.tags(),
          );
          if (mapping === null) return;
          new Notice(summarizeForestImport(await services.importForest(text, mapping)), 10_000);
        } catch (error) {
          context.reportError(error);
        }
      });
    });
}
