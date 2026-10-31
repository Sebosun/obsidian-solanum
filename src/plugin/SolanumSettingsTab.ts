import { Notice, PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import { PRESETS, type Settings } from "../lib/settings";
import type { SolanumHost } from "../types/host";

export class SolanumSettingsTab extends PluginSettingTab {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    app: App,
    plugin: Plugin,
    private host: SolanumHost,
  ) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.replaceChildren();
    const focusOptions = Object.fromEntries(
      PRESETS.map((minutes) => [String(minutes), `${minutes} min`]),
    );

    new Setting(this.containerEl).setName("Focus duration").addDropdown((control) => {
      control.addOptions(focusOptions).setValue(String(this.host.settings.defaultMinutes));
      control.onChange(this.changeFocus);
    });
    new Setting(this.containerEl)
      .setName("Break duration")
      .setDesc("Minutes, from 1 to 1440.")
      .addText((control) => {
        control.setValue(String(this.host.settings.breakMinutes));
        control.onChange(this.changeBreak);
      });
    new Setting(this.containerEl).setName("Automatic breaks").addToggle((control) => {
      control.setValue(this.host.settings.autoBreak).onChange(this.changeAutoBreak);
    });
    new Setting(this.containerEl).setName("Completion sound").addToggle((control) => {
      control.setValue(this.host.settings.sound).onChange(this.changeSound);
    });
    new Setting(this.containerEl).setName("Volume").addSlider((control) => {
      control
        .setLimits(0, 100, 5)
        .setValue(this.host.settings.volume * 100)
        .setDynamicTooltip();
      control.onChange(this.changeVolume);
    });
    new Setting(this.containerEl).setName("Preview").addButton((control) => {
      control.setButtonText("Test sound").onClick(this.host.previewSound);
    });
  }

  private save(patch: Partial<Settings>): Promise<void> {
    const save = async () => {
      await this.host.saveSettings({ ...this.host.settings, ...patch });
    };
    this.pending = this.pending.then(save).catch(this.reportError);
    return this.pending;
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    new Notice(message);
  }

  private changeFocus = (value: string) => this.save({ defaultMinutes: Number(value) });
  private changeAutoBreak = (value: boolean) => this.save({ autoBreak: value });
  private changeSound = (value: boolean) => this.save({ sound: value });
  private changeVolume = (value: number) => this.save({ volume: value / 100 });

  private changeBreak = async (value: string): Promise<void> => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return;
    await this.save({ breakMinutes: minutes });
  };
}
