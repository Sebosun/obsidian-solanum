import { Setting } from "obsidian";
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES } from "@/lib/timer/limits";
import { DEFAULT_PRESETS, effectiveDefaultMinutes, parsePresets } from "@/lib/timer/presets";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

const PRESETS_HELP = "Quick durations in minutes, separated by commas.";

/** Durations and how a session flows into its break. */
export function displayTimerSettings(context: SettingsContext): void {
  const { containerEl, host } = context;
  addHeading(context, "Timer");

  const presets = new Setting(containerEl).setName("Focus presets").setDesc(PRESETS_HELP);
  presets.addText((control) => {
    control.setPlaceholder(DEFAULT_PRESETS.join(", ")).setValue(host.settings.presets.join(", "));
    // Validate while typing, but only apply when the edit is finished.
    control.onChange(function showProblem(value) {
      const parsed = parsePresets(value);
      presets.setDesc(parsed.ok ? PRESETS_HELP : parsed.reason);
    });
    control.inputEl.addEventListener("change", async function applyPresets() {
      const parsed = parsePresets(control.inputEl.value);
      if (!parsed.ok) return;
      await context.save({ presets: parsed.presets });
      context.refresh();
    });
  });

  const focusOptions = Object.fromEntries(
    host.settings.presets.map((minutes) => [String(minutes), `${minutes} min`]),
  );
  new Setting(containerEl).setName("Focus duration").addDropdown((control) => {
    const current = effectiveDefaultMinutes(host.settings.presets, host.settings.defaultMinutes);
    control.addOptions(focusOptions).setValue(String(current));
    control.onChange(function changeFocus(value) {
      return context.save({ defaultMinutes: Number(value) });
    });
  });

  new Setting(containerEl)
    .setName("Break duration")
    .setDesc(`Minutes, from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES}.`)
    .addText((control) => {
      control.setValue(String(host.settings.breakMinutes));
      control.onChange(async function changeBreak(value) {
        const minutes = Number(value);
        if (!Number.isFinite(minutes)) return;
        if (minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) return;
        await context.save({ breakMinutes: minutes });
      });
    });

  new Setting(containerEl).setName("Automatic breaks").addToggle((control) => {
    control.setValue(host.settings.autoBreak).onChange(function changeAutoBreak(value) {
      return context.save({ autoBreak: value });
    });
  });
}
