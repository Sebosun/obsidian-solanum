import { DEFAULT_PRESETS, readPresets } from "@/lib/timer/presets";
import { parseSoundPath } from "@/lib/audio/soundPath";
import { SEASON_CHOICES, type SeasonChoice } from "@/lib/scene/seasons";
import {
  DEFAULT_DAY_NOTES_FOLDER,
  DEFAULT_SESSION_FOLDER,
  parseDayNotesFolder,
  parseSessionFolder,
} from "@/lib/storage/folder";

export interface Settings {
  defaultMinutes: number;
  /** Focus durations offered as quick choices, in minutes. */
  presets: number[];
  breakMinutes: number;
  autoBreak: boolean;
  sound: boolean;
  volume: number;
  /** Vault-relative folder holding session revision files. */
  sessionFolder: string;
  /** Keep a markdown note per day summarising its sessions. */
  dayNotes: boolean;
  /** Vault folder for the day notes. */
  dayNotesFolder: string;
  /** Vault audio file played when focus ends; empty uses the built-in chime. */
  focusSound: string;
  /** Vault audio file played when a break ends; empty uses the built-in chime. */
  breakSound: string;
  /** Scene theme: follow the calendar (northern hemisphere) or force a season. */
  season: SeasonChoice;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: 25,
  presets: [...DEFAULT_PRESETS],
  breakMinutes: 5,
  autoBreak: false,
  sound: true,
  volume: 0.4,
  sessionFolder: DEFAULT_SESSION_FOLDER,
  season: "auto",
  focusSound: "",
  breakSound: "",
  dayNotes: true,
  dayNotesFolder: DEFAULT_DAY_NOTES_FOLDER,
};

export function readSettings(value: unknown): Settings {
  const s = (value && typeof value === "object" ? value : {}) as Partial<Settings>;
  return {
    defaultMinutes:
      Number.isInteger(s.defaultMinutes) && s.defaultMinutes! >= 1 && s.defaultMinutes! <= 1440
        ? s.defaultMinutes!
        : 25,
    presets: readPresets(s.presets),
    breakMinutes:
      Number.isFinite(s.breakMinutes) && s.breakMinutes! >= 1 && s.breakMinutes! <= 1440
        ? s.breakMinutes!
        : 5,
    autoBreak: typeof s.autoBreak === "boolean" ? s.autoBreak : false,
    sound: typeof s.sound === "boolean" ? s.sound : true,
    volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume!)) : 0.4,
    sessionFolder: readSessionFolder(s.sessionFolder),
    dayNotes: typeof s.dayNotes === "boolean" ? s.dayNotes : true,
    dayNotesFolder: readDayNotesFolder(s.dayNotesFolder),
    focusSound: readSoundPath(s.focusSound),
    breakSound: readSoundPath(s.breakSound),
    season: SEASON_CHOICES.find((choice) => choice === s.season) ?? "auto",
  };
}

function readSessionFolder(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SESSION_FOLDER;
  const parsed = parseSessionFolder(value);
  return parsed.ok ? parsed.folder : DEFAULT_SESSION_FOLDER;
}

function readSoundPath(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = parseSoundPath(value);
  return parsed.ok ? parsed.path : "";
}

function readDayNotesFolder(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_DAY_NOTES_FOLDER;
  const parsed = parseDayNotesFolder(value);
  return parsed.ok ? parsed.folder : DEFAULT_DAY_NOTES_FOLDER;
}
