import { Notice, Setting } from "obsidian";
import { DEFAULT_DAY_NOTES_FOLDER, parseDayNotesFolder } from "@/lib/storage/folder";
import { FolderSuggest } from "@/plugin/FolderSuggest";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

const FOLDER_HELP = "Existing notes stay where they are if you change this.";

/** The markdown note written for each day. */
export function displayDayNotesSettings(context: SettingsContext): void {
  const { app, containerEl, host, services } = context;
  addHeading(context, "Day notes");

  new Setting(containerEl)
    .setName("Keep day notes up to date")
    .setDesc("Write a note per day with a summary of its sessions.")
    .addToggle((control) => {
      control.setValue(host.settings.dayNotes).onChange(function changeDayNotes(value) {
        return context.save({ dayNotes: value });
      });
    });

  const folder = new Setting(containerEl).setName("Day notes folder").setDesc(FOLDER_HELP);
  folder.addText((control) => {
    control.setPlaceholder(DEFAULT_DAY_NOTES_FOLDER).setValue(host.settings.dayNotesFolder);
    new FolderSuggest(app, control.inputEl);
    control.onChange(async function editFolder(value) {
      const parsed = parseDayNotesFolder(value);
      if (!parsed.ok) {
        folder.setDesc(parsed.reason);
        return;
      }
      folder.setDesc(FOLDER_HELP);
      await context.save({ dayNotesFolder: parsed.folder });
    });
  });

  new Setting(containerEl)
    .setName("Write notes for all history")
    .setDesc("Create or refresh a note for every day you have focused.")
    .addButton((control) => {
      control.setButtonText("Write notes for all history").onClick(async function writeAll() {
        try {
          const totals = await services.writeAllDayNotes();
          new Notice(
            `Day notes: ${totals.created} new, ${totals.updated} updated, ${totals.unchanged} unchanged.`,
          );
        } catch (error) {
          context.reportError(error);
        }
      });
    });
}
