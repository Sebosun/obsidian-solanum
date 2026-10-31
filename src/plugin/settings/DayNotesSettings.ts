import { Notice, Setting } from "obsidian";
import { DEFAULT_DAY_NOTES_FOLDER, parseDayNotesFolder } from "@/lib/storage/folder";
import { FolderSuggest } from "@/plugin/FolderSuggest";
import { confirmMove } from "@/plugin/ConfirmMoveModal";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

const FOLDER_HELP =
  "Root for YYYY/MM/YYYY-MM-DD.md documents. Changing the root does not move existing notes.";

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
    control.setDisabled(host.settings.dayNotesMigrationRoot !== null);
    new FolderSuggest(app, control.inputEl);
    control.onChange(async function editFolder(value) {
      if (host.settings.dayNotesMigrationRoot !== null) return;
      const parsed = parseDayNotesFolder(value);
      if (!parsed.ok) {
        folder.setDesc(parsed.reason);
        return;
      }
      folder.setDesc(FOLDER_HELP);
      await context.save({ dayNotesFolder: parsed.folder });
    });
  });

  if (host.settings.dayNotesLayout === "flat") {
    folder.setDesc(
      "Your notes still use the legacy flat layout. Preview and confirm migration below; custom roots are preserved.",
    );
    new Setting(containerEl)
      .setName("Organize notes by year/month")
      .setDesc(
        "Move existing Solanum day notes with Obsidian link updates. Unrelated files stay untouched.",
      )
      .addButton((control) => {
        const label = host.settings.dayNotesMigrationRoot
          ? "Resume migration…"
          : "Preview migration…";
        control.setButtonText(label).onClick(async function migrate() {
          control.setDisabled(true);
          try {
            const plan = await services.planDayNoteMigration();
            if (plan.conflicts.length > 0)
              throw new Error(
                `Documents already exist at ${plan.conflicts.join(", ")}. Nothing was moved.`,
              );
            const paths = plan.moves
              .slice(0, 10)
              .map((move) => `${move.from} → ${move.to}`)
              .join("\n");
            let message = `Move ${plan.moves.length} day documents from ${plan.from} into ${plan.to}/YYYY/MM/. ${plan.leftBehind.length} unrelated files stay where they are.\n\n${paths}`;
            if (plan.moves.length > 10) message += `\n… and ${plan.moves.length - 10} more.`;
            if (
              !(await confirmMove(app, message, {
                title: "Organize day notes?",
                button: "Move documents",
              }))
            )
              return;
            const moved = await services.migrateDayNotes();
            new Notice(
              `Moved ${moved} day documents. Future notes use ${host.settings.dayNotesFolder}/YYYY/MM/.`,
            );
          } catch (error) {
            context.reportError(error);
          } finally {
            control.setDisabled(false);
            context.refresh();
          }
        });
      });
  }

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
