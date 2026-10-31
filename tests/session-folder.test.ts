import { describe, expect, it } from "vitest";
import { parseDayNotesFolder, parseSessionFolder } from "@/lib/storage/folder";
import { DEFAULT_SETTINGS, readSettings } from "@/lib/settings";

describe("session folder setting", () => {
  it.each([
    ["Assets/sessions", "Assets/sessions"],
    ["  Assets/sessions/  ", "Assets/sessions"],
    ["/Assets//sessions", "Assets/sessions"],
    ["Focus log", "Focus log"],
    ["", "Solanum/sessions"],
    ["   ", "Solanum/sessions"],
  ])("accepts %j as %j", (input, folder) => {
    expect(parseSessionFolder(input)).toEqual({ ok: true, folder });
  });

  it.each([
    [".obsidian/sessions", /hidden/i],
    ["Assets/.sessions", /hidden/i],
    ["../outside", /vault/i],
    ["Assets/../../outside", /vault/i],
    ["./sessions", /vault/i],
    ["C:\\Users\\me\\sessions", /valid/i],
    ["Assets\\sessions", /valid/i],
    ["Assets/ses*ions", /valid/i],
    ["Solanum/debug-sessions", /debug/i],
    ["Solanum/debug-sessions/nested", /debug/i],
  ])("rejects %j", (input, reason) => {
    const result = parseSessionFolder(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it("persists a valid folder and falls back to the default for a corrupt stored value", () => {
    expect(readSettings({ sessionFolder: "Assets/sessions" }).sessionFolder).toBe(
      "Assets/sessions",
    );
    expect(readSettings({ sessionFolder: "../x" }).sessionFolder).toBe("Solanum/sessions");
    expect(readSettings({ sessionFolder: 4 }).sessionFolder).toBe("Solanum/sessions");
    expect(readSettings(null).sessionFolder).toBe(DEFAULT_SETTINGS.sessionFolder);
  });
});

describe("season theme setting", () => {
  it("accepts known choices and falls back to automatic", () => {
    expect(DEFAULT_SETTINGS.season).toBe("auto");
    expect(readSettings({ season: "winter" }).season).toBe("winter");
    expect(readSettings({ season: "monsoon" }).season).toBe("auto");
    expect(readSettings({ season: 3 }).season).toBe("auto");
    expect(readSettings(undefined).season).toBe("auto");
  });
});

describe("day notes settings", () => {
  it("defaults to on with their own folder, and repairs corrupt values", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      dayNotes: true,
      dayNotesFolder: "Solanum",
      dayNotesLayout: "calendar",
    });
    expect(readSettings({ dayNotes: false }).dayNotes).toBe(false);
    expect(readSettings({ dayNotes: "no" }).dayNotes).toBe(true);
    expect(readSettings({ dayNotesFolder: "Journal/Focus" }).dayNotesFolder).toBe("Journal/Focus");
    expect(readSettings({ dayNotesFolder: ".hidden" }).dayNotesFolder).toBe("Solanum");
    expect(readSettings({ dayNotesFolder: "" }).dayNotesFolder).toBe("Solanum");
  });

  it("does not let day notes into the debug folder", () => {
    expect(parseDayNotesFolder("Solanum/debug-sessions/days").ok).toBe(false);
    expect(parseDayNotesFolder("")).toEqual({ ok: true, folder: "Solanum" });
  });
});
