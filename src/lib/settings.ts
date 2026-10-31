import { SEASON_CHOICES, type SeasonChoice } from "@/lib/scene/seasons";
import { DEFAULT_SESSION_FOLDER, parseSessionFolder } from "@/lib/storage/folder";

export interface Settings {
  defaultMinutes: number;
  breakMinutes: number;
  autoBreak: boolean;
  sound: boolean;
  volume: number;
  /** Vault-relative folder holding session revision files. */
  sessionFolder: string;
  /** Scene theme: follow the calendar (northern hemisphere) or force a season. */
  season: SeasonChoice;
}

export const PRESETS = [5, 10, 25, 50, 60, 90, 120];
export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: 25,
  breakMinutes: 5,
  autoBreak: false,
  sound: true,
  volume: 0.4,
  sessionFolder: DEFAULT_SESSION_FOLDER,
  season: "auto",
};

export function readSettings(value: unknown): Settings {
  const s = (value && typeof value === "object" ? value : {}) as Partial<Settings>;
  return {
    defaultMinutes: PRESETS.includes(s.defaultMinutes!) ? s.defaultMinutes! : 25,
    breakMinutes:
      Number.isFinite(s.breakMinutes) && s.breakMinutes! >= 1 && s.breakMinutes! <= 1440
        ? s.breakMinutes!
        : 5,
    autoBreak: typeof s.autoBreak === "boolean" ? s.autoBreak : false,
    sound: typeof s.sound === "boolean" ? s.sound : true,
    volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume!)) : 0.4,
    sessionFolder: readSessionFolder(s.sessionFolder),
    season: SEASON_CHOICES.find((choice) => choice === s.season) ?? "auto",
  };
}

function readSessionFolder(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SESSION_FOLDER;
  const parsed = parseSessionFolder(value);
  return parsed.ok ? parsed.folder : DEFAULT_SESSION_FOLDER;
}
