import { Notice, PluginSettingTab, type App, type Plugin } from "obsidian";
import type { Settings } from "@/lib/settings";
import type { SettingsServices, SolanumHost } from "@/types/host";
import type { SettingsContext } from "@/plugin/settings/SettingsContext";
import { displayAppearanceSettings } from "@/plugin/settings/AppearanceSettings";
import { displayBackupSettings } from "@/plugin/settings/BackupSettings";
import { displayDocumentsSettings } from "@/plugin/settings/DocumentsSettings";
import { displaySessionStorageSettings } from "@/plugin/settings/SessionStorageSettings";
import { displaySoundSettings } from "@/plugin/settings/SoundSettings";
import { displayTimerSettings } from "@/plugin/settings/TimerSettings";

/** The sections, in the order they appear, grouped by what each one changes. */
const SECTIONS = [
  displayTimerSettings,
  displayAppearanceSettings,
  displaySoundSettings,
  displaySessionStorageSettings,
  displayDocumentsSettings,
  displayBackupSettings,
];

export class SolanumSettingsTab extends PluginSettingTab {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    app: App,
    plugin: Plugin,
    private host: SolanumHost,
    private services: SettingsServices,
  ) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.replaceChildren();
    const context: SettingsContext = {
      app: this.app,
      containerEl: this.containerEl,
      host: this.host,
      services: this.services,
      save: (patch) => this.save(patch),
      reportError: (error) => this.reportError(error),
      refresh: () => this.display(),
    };
    for (const section of SECTIONS) section(context);
  }

  private save(patch: Partial<Settings>): Promise<void> {
    const save = async () => {
      await this.host.saveSettings({ ...this.host.settings, ...patch });
    };
    this.pending = this.pending.then(save).catch((error) => this.reportError(error));
    return this.pending;
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    new Notice(message);
  }
}
