import { isFiniteNumber, isRecord } from "@/lib/guards";
import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_FOCUS_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
} from "@/lib/timer/limits";
import { DEFAULT_PRESETS, readPresets } from "@/lib/timer/presets";
import type { DayNoteLocation } from "@/lib/notes/DayNoteService";
import { parseSoundPath } from "@/lib/audio/soundPath";
import { SEASON_CHOICES, type SeasonChoice } from "@/lib/scene/seasons";
import {
  DEFAULT_DAY_NOTES_FOLDER,
  DEFAULT_SESSION_FOLDER,
  parseDayNotesFolder,
  parseSessionFolder,
} from "@/lib/storage/folder";

export interface Settings extends DayNoteLocation {
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
  /** Vault audio file played when focus ends; empty uses the built-in chime. */
  focusSound: string;
  /** Vault audio file played when a break ends; empty uses the built-in chime. */
  breakSound: string;
  /** Scene theme: follow the calendar (northern hemisphere) or force a season. */
  season: SeasonChoice;
}

const DEFAULT_VOLUME = 0.4;

export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: DEFAULT_FOCUS_MINUTES,
  presets: [...DEFAULT_PRESETS],
  breakMinutes: DEFAULT_BREAK_MINUTES,
  autoBreak: false,
  sound: true,
  volume: DEFAULT_VOLUME,
  sessionFolder: DEFAULT_SESSION_FOLDER,
  season: "auto",
  focusSound: "",
  breakSound: "",
  dayNotes: true,
  dayNotesFolder: DEFAULT_DAY_NOTES_FOLDER,
  dayNotesLayout: "calendar",
  dayNotesMigrationRoot: null,
};

const withinDuration = (value: number) =>
  value >= MIN_DURATION_MINUTES && value <= MAX_DURATION_MINUTES;

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Saved settings are untrusted: each field is checked on its own, and a bad one gets its default. */
export function readSettings(value: unknown): Settings {
  const saved = isRecord(value) ? value : {};
  const { defaultMinutes, breakMinutes, volume } = saved;
  return {
    defaultMinutes:
      isFiniteNumber(defaultMinutes) &&
      Number.isInteger(defaultMinutes) &&
      withinDuration(defaultMinutes)
        ? defaultMinutes
        : DEFAULT_SETTINGS.defaultMinutes,
    presets: readPresets(saved.presets),
    breakMinutes:
      isFiniteNumber(breakMinutes) && withinDuration(breakMinutes)
        ? breakMinutes
        : DEFAULT_SETTINGS.breakMinutes,
    autoBreak: readBoolean(saved.autoBreak, DEFAULT_SETTINGS.autoBreak),
    sound: readBoolean(saved.sound, DEFAULT_SETTINGS.sound),
    volume: isFiniteNumber(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_SETTINGS.volume,
    sessionFolder: readSessionFolder(saved.sessionFolder),
    dayNotes: readBoolean(saved.dayNotes, DEFAULT_SETTINGS.dayNotes),
    dayNotesFolder: readDayNotesFolder(saved.dayNotesFolder),
    dayNotesMigrationRoot: readMigrationRoot(saved.dayNotesMigrationRoot),
    dayNotesLayout: readDayNotesLayout(saved.dayNotesLayout, saved.dayNotesFolder),
    focusSound: readSoundPath(saved.focusSound),
    breakSound: readSoundPath(saved.breakSound),
    season: SEASON_CHOICES.find((choice) => choice === saved.season) ?? DEFAULT_SETTINGS.season,
  };
}

function readMigrationRoot(value: unknown): string | null {
  if (typeof value !== "string" || !parseDayNotesFolder(value).ok) return null;
  return readDayNotesFolder(value);
}

/** Saved before layouts existed: a custom folder meant the old flat layout. */
function readDayNotesLayout(layout: unknown, folder: unknown): DayNoteLocation["dayNotesLayout"] {
  if (layout === "flat" || layout === "calendar") return layout;
  if (typeof folder === "string" && folder.trim() !== "") return "flat";
  return "calendar";
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
