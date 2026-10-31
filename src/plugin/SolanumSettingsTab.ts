import {
  Notice,
  PluginSettingTab,
  Setting,
  type App,
  type ButtonComponent,
  type Plugin,
} from "obsidian";
import { PRESETS, type Settings } from "@/lib/settings";
import { parseSoundPath } from "@/lib/audio/soundPath";
import { SEASON_CHOICES, SEASON_THEMES } from "@/lib/scene/seasons";
import {
  DEFAULT_DAY_NOTES_FOLDER,
  DEFAULT_SESSION_FOLDER,
  parseDayNotesFolder,
  parseSessionFolder,
} from "@/lib/storage/folder";
import type { MovePlan } from "@/lib/storage/migration";
import { summarizeImport } from "@/lib/storage/exchange";
import { confirmMove } from "@/plugin/ConfirmMoveModal";
import { pickTextFile } from "@/plugin/pickTextFile";
import { AudioFileSuggest } from "@/plugin/AudioFileSuggest";
import { FolderSuggest } from "@/plugin/FolderSuggest";
import type { CompletionPhase, SettingsServices, SolanumHost } from "@/types/host";

const DAY_NOTES_HELP = "Existing notes stay where they are if you change this.";
const SOUND_HELP = "Audio file from your vault. Leave empty for the built-in chime.";
type SoundKey = "focusSound" | "breakSound";

const FOLDER_HELP = "Vault folder for session files. Changing it moves your existing sessions.";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function describeMove(from: string, to: string, plan: MovePlan): string {
  let message = `Move ${plural(plan.toMove, "session file")} from ${from} to ${to}.`;
  if (plan.alreadyThere > 0)
    message += ` ${plural(plan.alreadyThere, "file")} already in ${to} will be merged.`;
  if (plan.leftBehind.length > 0)
    message += ` ${plural(plan.leftBehind.length, "file")} that are not sessions will stay in ${from}.`;
  return message;
}

export class SolanumSettingsTab extends PluginSettingTab {
  private pending: Promise<void> = Promise.resolve();
  private folderSetting: Setting | null = null;
  private moveButton: ButtonComponent | null = null;
  private folderInput = "";

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
    const focusOptions = Object.fromEntries(
      PRESETS.map((minutes) => [String(minutes), `${minutes} min`]),
    );

    const seasonOptions = Object.fromEntries(
      SEASON_CHOICES.map((choice) => [
        choice,
        choice === "auto" ? "Automatic" : SEASON_THEMES[choice].label,
      ]),
    );
    new Setting(this.containerEl)
      .setName("Season theme")
      .setDesc("Automatic follows the calendar for the northern hemisphere.")
      .addDropdown((control) => {
        control.addOptions(seasonOptions).setValue(this.host.settings.season);
        control.onChange(this.changeSeason);
      });
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
    this.displaySessionFolder();
    this.displayDayNotes();
    this.displayBackup();
    this.displaySound("Focus completion sound", "focusSound", "focus");
    this.displaySound("Break completion sound", "breakSound", "break");
    new Setting(this.containerEl).setName("Preview").addButton((control) => {
      control.setButtonText("Test sound").onClick(this.previewFocus);
    });
  }

  private displaySessionFolder(): void {
    this.folderInput = this.host.settings.sessionFolder;
    const setting = new Setting(this.containerEl).setName("Session folder").setDesc(FOLDER_HELP);
    setting.addText((control) => {
      control.setPlaceholder(DEFAULT_SESSION_FOLDER).setValue(this.folderInput);
      new FolderSuggest(this.app, control.inputEl);
      control.onChange(this.editFolder);
    });
    setting.addButton((control) => {
      control.setButtonText("Move sessions").setCta().setDisabled(true);
      control.onClick(this.moveFolder);
      this.moveButton = control;
    });
    this.folderSetting = setting;
  }

  private displaySound(name: string, key: SoundKey, phase: CompletionPhase): void {
    const setting = new Setting(this.containerEl).setName(name).setDesc(SOUND_HELP);
    setting.addText((control) => {
      control.setPlaceholder("Built-in chime").setValue(this.host.settings[key]);
      new AudioFileSuggest(this.app, control.inputEl);
      control.onChange((value) => this.editSound(setting, key, value));
    });
    setting.addButton((control) => {
      control.setButtonText("Test").onClick(() => this.host.previewSound(phase));
    });
  }

  private editSound = async (setting: Setting, key: SoundKey, value: string): Promise<void> => {
    const parsed = parseSoundPath(value);
    if (!parsed.ok) {
      setting.setDesc(parsed.reason);
      return;
    }
    if (parsed.path && !this.app.vault.getAbstractFileByPath(parsed.path)) {
      setting.setDesc("That file is not in the vault.");
      return;
    }
    setting.setDesc(SOUND_HELP);
    await this.save({ [key]: parsed.path });
  };

  private previewFocus = () => this.host.previewSound("focus");

  private displayDayNotes(): void {
    new Setting(this.containerEl)
      .setName("Day notes")
      .setDesc("Keep a note per day with a summary of its sessions.")
      .addToggle((control) => {
        control.setValue(this.host.settings.dayNotes).onChange(this.changeDayNotes);
      });
    const folder = new Setting(this.containerEl)
      .setName("Day notes folder")
      .setDesc(DAY_NOTES_HELP);
    folder.addText((control) => {
      control.setPlaceholder(DEFAULT_DAY_NOTES_FOLDER).setValue(this.host.settings.dayNotesFolder);
      new FolderSuggest(this.app, control.inputEl);
      control.onChange((value) => this.editDayNotesFolder(folder, value));
    });
    new Setting(this.containerEl)
      .setName("Write notes for all history")
      .setDesc("Create or refresh a note for every day you have focused.")
      .addButton((control) => {
        control.setButtonText("Write notes for all history").onClick(this.writeAllDayNotes);
      });
  }

  private changeDayNotes = (value: boolean) => this.save({ dayNotes: value });

  private editDayNotesFolder = async (setting: Setting, value: string): Promise<void> => {
    const parsed = parseDayNotesFolder(value);
    if (!parsed.ok) {
      setting.setDesc(parsed.reason);
      return;
    }
    setting.setDesc(DAY_NOTES_HELP);
    await this.save({ dayNotesFolder: parsed.folder });
  };

  private writeAllDayNotes = async (): Promise<void> => {
    try {
      const totals = await this.services.writeAllDayNotes();
      new Notice(
        `Day notes: ${totals.created} new, ${totals.updated} updated, ${totals.unchanged} unchanged.`,
      );
    } catch (error) {
      this.reportError(error);
    }
  };

  private displayBackup(): void {
    new Setting(this.containerEl)
      .setName("Export sessions")
      .setDesc("Save your whole session history to one file in the vault.")
      .addButton((control) => {
        control.setButtonText("Export").onClick(this.exportSessions);
      });
    new Setting(this.containerEl)
      .setName("Import sessions")
      .setDesc("Merge sessions from an export file. Existing sessions are never overwritten.")
      .addButton((control) => {
        control.setButtonText("Import…").onClick(this.importSessions);
      });
  }

  private exportSessions = async (): Promise<void> => {
    try {
      const { path, count } = await this.services.exportSessions();
      new Notice(`Exported ${count} revisions to ${path}`);
    } catch (error) {
      this.reportError(error);
    }
  };

  private importSessions = async (): Promise<void> => {
    try {
      const text = await pickTextFile();
      if (text === null) return;
      new Notice(summarizeImport(await this.services.importSessions(text)), 10_000);
    } catch (error) {
      this.reportError(error);
    }
  };

  private editFolder = (value: string): void => {
    this.folderInput = value;
    const parsed = parseSessionFolder(value);
    if (!parsed.ok) {
      this.folderSetting?.setDesc(parsed.reason);
      this.moveButton?.setDisabled(true);
      return;
    }
    this.folderSetting?.setDesc(FOLDER_HELP);
    this.moveButton?.setDisabled(parsed.folder === this.host.settings.sessionFolder);
  };

  private moveFolder = async (): Promise<void> => {
    const parsed = parseSessionFolder(this.folderInput);
    if (!parsed.ok) return;
    const from = this.host.settings.sessionFolder;
    try {
      const plan = await this.services.planSessionFolder(parsed.folder);
      if (plan.conflicts.length > 0)
        throw new Error(
          `${plural(plan.conflicts.length, "file")} in ${parsed.folder} would be overwritten with different content. Nothing was moved.`,
        );
      if (!(await confirmMove(this.app, describeMove(from, parsed.folder, plan)))) return;
      const result = await this.services.moveSessionFolder(parsed.folder);
      new Notice(`Moved ${plural(result.moved, "session file")} to ${parsed.folder}.`);
    } catch (error) {
      this.reportError(error);
    }
    this.display();
  };

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

  private changeSeason = (value: string) => {
    const season = SEASON_CHOICES.find((choice) => choice === value);
    if (season) return this.save({ season });
  };
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
