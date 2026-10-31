import { Setting } from "obsidian";
import { parseSoundPath } from "@/lib/audio/soundPath";
import { AudioFileSuggest } from "@/plugin/AudioFileSuggest";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";
import type { CompletionPhase } from "@/types/host";

const SOUND_HELP = "Audio file from your vault. Leave empty for the built-in chime.";
type SoundKey = "focusSound" | "breakSound";

/** Whether and how the end of a phase is announced. */
export function displaySoundSettings(context: SettingsContext): void {
  const { containerEl, host } = context;
  addHeading(context, "Sound");

  new Setting(containerEl).setName("Completion sound").addToggle((control) => {
    control.setValue(host.settings.sound).onChange(function changeSound(value) {
      return context.save({ sound: value });
    });
  });
  new Setting(containerEl).setName("Volume").addSlider((control) => {
    control
      .setLimits(0, 100, 5)
      .setValue(host.settings.volume * 100)
      .setDynamicTooltip();
    control.onChange(function changeVolume(value) {
      return context.save({ volume: value / 100 });
    });
  });
  displayFileSetting(context, "Focus completion sound", "focusSound", "focus");
  displayFileSetting(context, "Break completion sound", "breakSound", "break");
  new Setting(containerEl).setName("Preview").addButton((control) => {
    control.setButtonText("Test sound").onClick(function previewFocus() {
      host.previewSound("focus");
    });
  });
}

function displayFileSetting(
  context: SettingsContext,
  name: string,
  key: SoundKey,
  phase: CompletionPhase,
): void {
  const { app, host } = context;
  const setting = new Setting(context.containerEl).setName(name).setDesc(SOUND_HELP);
  setting.addText((control) => {
    control.setPlaceholder("Built-in chime").setValue(host.settings[key]);
    new AudioFileSuggest(app, control.inputEl);
    control.onChange(async function editSound(value) {
      const parsed = parseSoundPath(value);
      if (!parsed.ok) {
        setting.setDesc(parsed.reason);
        return;
      }
      if (parsed.path && !app.vault.getAbstractFileByPath(parsed.path)) {
        setting.setDesc("That file is not in the vault.");
        return;
      }
      setting.setDesc(SOUND_HELP);
      await context.save({ [key]: parsed.path });
    });
  });
  setting.addButton((control) => {
    control.setButtonText("Test").onClick(function previewPhase() {
      host.previewSound(phase);
    });
  });
}
