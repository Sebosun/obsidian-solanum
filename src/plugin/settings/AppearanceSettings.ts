import { Setting } from "obsidian";
import { SEASON_CHOICES, SEASON_THEMES } from "@/lib/scene/seasons";
import { addHeading, type SettingsContext } from "@/plugin/settings/SettingsContext";

/** How the scenes look. */
export function displayAppearanceSettings(context: SettingsContext): void {
  addHeading(context, "Appearance");
  const seasonOptions = Object.fromEntries(
    SEASON_CHOICES.map((choice) => [
      choice,
      choice === "auto" ? "Automatic" : SEASON_THEMES[choice].label,
    ]),
  );
  new Setting(context.containerEl)
    .setName("Season theme")
    .setDesc("Automatic follows the calendar for the northern hemisphere.")
    .addDropdown((control) => {
      control.addOptions(seasonOptions).setValue(context.host.settings.season);
      control.onChange(function changeSeason(value) {
        const season = SEASON_CHOICES.find((choice) => choice === value);
        if (season) return context.save({ season });
      });
    });
}
