import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readSettings } from "@/lib/settings";

describe("reading saved settings", () => {
  it("gives every default when nothing usable was saved", () => {
    for (const saved of [undefined, null, "text", 7, [], [1, 2]])
      expect(readSettings(saved)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps good values and defaults only the bad ones", () => {
    const settings = readSettings({
      defaultMinutes: 50,
      breakMinutes: 12,
      autoBreak: true,
      sound: false,
      volume: 0.9,
      season: "winter",
      presets: [15, 45],
      dayNotes: false,
      sessionFolder: "Work/sessions",
      dayNotesFolder: "Journal",
      dayNotesLayout: "calendar",
      focusSound: "Sounds/ding.mp3",
      breakSound: "Sounds/bell.wav",
      surprise: "ignored",
    });
    expect(settings).toEqual({
      defaultMinutes: 50,
      breakMinutes: 12,
      autoBreak: true,
      sound: false,
      volume: 0.9,
      season: "winter",
      presets: [15, 45],
      dayNotes: false,
      sessionFolder: "Work/sessions",
      dayNotesFolder: "Journal",
      dayNotesLayout: "calendar",
      dayNotesMigrationRoot: null,
      focusSound: "Sounds/ding.mp3",
      breakSound: "Sounds/bell.wav",
    });
  });

  it("replaces values of the wrong type or outside their range, field by field", () => {
    const settings = readSettings({
      defaultMinutes: "25",
      breakMinutes: 0,
      autoBreak: "yes",
      sound: 1,
      volume: "loud",
      season: "monsoon",
      presets: "5, 10",
      dayNotes: null,
      sessionFolder: 12,
      dayNotesFolder: { path: "x" },
      focusSound: ["a.mp3"],
      breakSound: "notes.txt",
    });
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("rejects out-of-range and fractional durations", () => {
    expect(readSettings({ defaultMinutes: 0 }).defaultMinutes).toBe(25);
    expect(readSettings({ defaultMinutes: 1441 }).defaultMinutes).toBe(25);
    expect(readSettings({ defaultMinutes: 12.5 }).defaultMinutes).toBe(25);
    expect(readSettings({ defaultMinutes: 1440 }).defaultMinutes).toBe(1440);
    expect(readSettings({ breakMinutes: 1441 }).breakMinutes).toBe(5);
    expect(readSettings({ breakMinutes: 0.5 }).breakMinutes).toBe(5);
    expect(readSettings({ breakMinutes: Number.NaN }).breakMinutes).toBe(5);
    expect(readSettings({ breakMinutes: 1 }).breakMinutes).toBe(1);
  });

  it("clamps the volume into 0 to 1 and ignores one that is not a number", () => {
    expect(readSettings({ volume: 3 }).volume).toBe(1);
    expect(readSettings({ volume: -1 }).volume).toBe(0);
    expect(readSettings({ volume: Number.POSITIVE_INFINITY }).volume).toBe(0.4);
  });

  it("drops folders that cannot be used and an unusable migration marker", () => {
    const settings = readSettings({
      sessionFolder: ".hidden/sessions",
      dayNotesFolder: "../outside",
      dayNotesMigrationRoot: ".hidden",
    });
    expect(settings.sessionFolder).toBe(DEFAULT_SETTINGS.sessionFolder);
    expect(settings.dayNotesFolder).toBe(DEFAULT_SETTINGS.dayNotesFolder);
    expect(settings.dayNotesMigrationRoot).toBeNull();
    expect(readSettings({ dayNotesMigrationRoot: "Journal" }).dayNotesMigrationRoot).toBe(
      "Journal",
    );
    expect(readSettings({ dayNotesMigrationRoot: 5 }).dayNotesMigrationRoot).toBeNull();
  });

  it("treats a custom documents folder saved before layouts existed as the flat layout", () => {
    expect(readSettings({ dayNotesFolder: "Solanum/days" }).dayNotesLayout).toBe("flat");
    expect(readSettings({ dayNotesFolder: "  " }).dayNotesLayout).toBe("calendar");
    expect(readSettings({}).dayNotesLayout).toBe("calendar");
    expect(readSettings({ dayNotesFolder: "Journal", dayNotesLayout: "calendar" })).toMatchObject({
      dayNotesLayout: "calendar",
    });
    expect(readSettings({ dayNotesLayout: "spiral", dayNotesFolder: "J" }).dayNotesLayout).toBe(
      "flat",
    );
  });
});
