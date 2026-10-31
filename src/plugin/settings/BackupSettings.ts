import { Notice, Setting } from "obsidian";
import {
  defaultForestMapping,
  parseForestCsv,
  previewForest,
  summarizeForestImport,
} from "@/lib/import/forest";
import { summarizeImport } from "@/lib/storage/exchange";
import { plural } from "@/lib/text";
import { askForestMapping } from "@/plugin/ForestImportModal";
import { confirmDocumentOrganization } from "@/plugin/confirmDocumentOrganization";
import { pickTextFile } from "@/plugin/pickTextFile";
import { pickVaultFile } from "@/plugin/pickVaultFile";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

/** How long the result of an import stays on screen, and the hint about a missing file dialog. */
const IMPORT_SUMMARY_NOTICE_MS = 10_000;
const NO_DIALOG_NOTICE_MS = 8_000;

/** Moving the whole session history in and out as a file. */
export function displayBackupSettings(context: SettingsContext): void {
  const { app, containerEl, host, services } = context;
  let createDocuments = true;
  addHeading(context, "Backup");

  /** Backup actions report their failures as notices instead of throwing into Obsidian. */
  const reporting = (action: () => Promise<void>) => async () => {
    try {
      await action();
    } catch (error) {
      context.reportError(error);
    }
  };

  new Setting(containerEl)
    .setName("Export sessions")
    .setDesc("Save your whole session history to one file in the vault.")
    .addButton((control) => {
      control.setButtonText("Export").onClick(reporting(exportSessions));
    });
  async function exportSessions(): Promise<void> {
    const { path, sessions } = await services.exportSessions();
    new Notice(`Exported ${plural(sessions, "session")} to ${path}`);
  }

  const NO_DIALOG_HINT =
    "No file dialog appeared? Put the file in your vault and use “From vault…” instead.";

  /** Runs a long import with a notice that stays up until it finishes. */
  async function whileImporting<T>(
    work: (onDocumentProgress: (done: number, total: number) => void) => Promise<T>,
  ): Promise<T> {
    const working = new Notice("Importing sessions…", 0);
    try {
      return await work((done, total) => working.setMessage(`Writing documents… ${done}/${total}`));
    } finally {
      working.hide();
    }
  }

  async function importSessionsFrom(text: string | null): Promise<void> {
    if (text === null) return;
    if (!(await confirmCalendarDocuments(createDocuments))) return;
    const result = await whileImporting((onDocumentProgress) =>
      services.importSessions(text, { createDocuments, onDocumentProgress }),
    );
    new Notice(summarizeImport(result), IMPORT_SUMMARY_NOTICE_MS);
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
    if (!(await confirmCalendarDocuments(mapping.createDocuments !== false))) return;
    const result = await whileImporting((onDocumentProgress) =>
      services.importForest(text, mapping, { onDocumentProgress }),
    );
    new Notice(summarizeForestImport(result), IMPORT_SUMMARY_NOTICE_MS);
  }

  async function confirmCalendarDocuments(enabled: boolean): Promise<boolean> {
    if (!enabled || services.dayNoteMigrationState() === "settled") return true;
    return confirmDocumentOrganization(app, await services.planDayNoteMigration());
  }

  const fromSystem = (accept: string) =>
    pickTextFile({ accept, onNoDialog: () => new Notice(NO_DIALOG_HINT, NO_DIALOG_NOTICE_MS) });
  const fromVault = async (extensions: string[]) =>
    (await pickVaultFile(app, extensions))?.text ?? null;

  const importSessionsFromFile = async () =>
    importSessionsFrom(await fromSystem(".json,application/json"));
  const importSessionsFromVault = async () => importSessionsFrom(await fromVault(["json"]));
  const importForestFromFile = async () => importForestFrom(await fromSystem(".csv,text/csv"));
  const importForestFromVault = async () => importForestFrom(await fromVault(["csv"]));

  new Setting(containerEl)
    .setName("Create/update documents when importing")
    .setDesc(
      "For Solanum backups. Forest imports have their own document option in the import dialog.",
    )
    .addToggle((control) => {
      control.setValue(true).onChange((value) => {
        createDocuments = value;
      });
    });

  new Setting(containerEl)
    .setName("Import sessions")
    .setDesc("Merge sessions from an export file. Existing sessions are never overwritten.")
    .addButton((control) => {
      control.setButtonText("Import…").onClick(reporting(importSessionsFromFile));
    })
    .addButton((control) => {
      control.setButtonText("From vault…").onClick(reporting(importSessionsFromVault));
    });

  new Setting(containerEl)
    .setName("Import from Forest")
    .setDesc(
      "Add the finished trees from a Forest CSV export. You choose which tag and which plant each one becomes.",
    )
    .addButton((control) => {
      control.setButtonText("Choose CSV…").onClick(reporting(importForestFromFile));
    })
    .addButton((control) => {
      control.setButtonText("CSV from vault…").onClick(reporting(importForestFromVault));
    });
}
