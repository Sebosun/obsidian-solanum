import { Notice, Setting } from "obsidian";
import { DEFAULT_DAY_NOTES_FOLDER, parseDayNotesFolder } from "@/lib/storage/folder";
import { FolderSuggest } from "@/plugin/FolderSuggest";
import { describeDocumentTotals } from "@/lib/notes/documentReport";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

const FOLDER_HELP =
  "Root for YYYY/MM/YYYY-MM-DD.md session documents. Changing this folder leaves existing documents in place.";

/** The markdown note written for each day. */
export function displayDocumentsSettings(context: SettingsContext): void {
  const { app, containerEl, host, services } = context;
  const interrupted = services.dayNoteMigrationState() === "interrupted";
  addHeading(context, "Documents");

  new Setting(containerEl)
    .setName("Keep documents up to date")
    .setDesc("Automatically update documents as your sessions change.")
    .addToggle((control) => {
      control.setValue(host.settings.dayNotes).onChange(function changeDayNotes(value) {
        return context.save({ dayNotes: value });
      });
    });

  const folder = new Setting(containerEl).setName("Documents folder").setDesc(FOLDER_HELP);
  folder.addText((control) => {
    control.setPlaceholder(DEFAULT_DAY_NOTES_FOLDER).setValue(host.settings.dayNotesFolder);
    control.setDisabled(interrupted);
    new FolderSuggest(app, control.inputEl);
    control.onChange(async function editFolder(value) {
      if (interrupted) return;
      const parsed = parseDayNotesFolder(value);
      if (!parsed.ok) {
        folder.setDesc(parsed.reason);
        return;
      }
      folder.setDesc(FOLDER_HELP);
      await context.save({ dayNotesFolder: parsed.folder });
    });
  });

  if (interrupted) {
    folder.setDesc(
      "A document update was interrupted. Use “Write documents for all history” to retry before changing this folder.",
    );
  }

  new Setting(containerEl)
    .setName("Write documents for all history")
    .setDesc("Create or refresh session documents in the same year/month/day layout.")
    .addButton((control) => {
      control.setButtonText("Write documents for all history").onClick(async function writeAll() {
        control.setDisabled(true);
        try {
          const totals = await services.writeAllDayNotes();
          new Notice(describeDocumentTotals(totals));
        } catch (error) {
          context.reportError(error);
        } finally {
          control.setDisabled(false);
          context.refresh();
        }
      });
    });
}
