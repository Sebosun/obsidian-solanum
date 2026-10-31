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
import { pickVaultFile } from "@/plugin/pickVaultFile";
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
  const NO_DIALOG_HINT =
    "No file dialog appeared? Put the file in your vault and use “From vault…” instead.";

  /** Runs a long import with a notice that stays up until it finishes. */
  async function whileImporting<T>(work: () => Promise<T>): Promise<T> {
    const working = new Notice("Importing sessions…", 0);
    try {
      return await work();
    } finally {
      working.hide();
    }
  }

  async function importSessionsFrom(text: string | null): Promise<void> {
    if (text === null) return;
    const result = await whileImporting(() => services.importSessions(text));
    new Notice(summarizeImport(result), 10_000);
  }

  async function importForestFrom(text: string | null): Promise<void> {
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
    const result = await whileImporting(() => services.importForest(text, mapping));
    new Notice(summarizeForestImport(result), 10_000);
  }

  const fromSystem = (accept: string) =>
    pickTextFile({ accept, onNoDialog: () => new Notice(NO_DIALOG_HINT, 8000) });
  const fromVault = async (extensions: string[]) =>
    (await pickVaultFile(app, extensions))?.text ?? null;

  new Setting(containerEl)
    .setName("Import sessions")
    .setDesc("Merge sessions from an export file. Existing sessions are never overwritten.")
    .addButton((control) => {
      control.setButtonText("Import…").onClick(async function importSessions() {
        try {
          await importSessionsFrom(await fromSystem(".json,application/json"));
        } catch (error) {
          context.reportError(error);
        }
      });
    })
    .addButton((control) => {
      control.setButtonText("From vault…").onClick(async function importSessionsFromVault() {
        try {
          await importSessionsFrom(await fromVault(["json"]));
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
          await importForestFrom(await fromSystem(".csv,text/csv"));
        } catch (error) {
          context.reportError(error);
        }
      });
    })
    .addButton((control) => {
      control.setButtonText("CSV from vault…").onClick(async function importForestFromVault() {
        try {
          await importForestFrom(await fromVault(["csv"]));
        } catch (error) {
          context.reportError(error);
        }
      });
    });
}
