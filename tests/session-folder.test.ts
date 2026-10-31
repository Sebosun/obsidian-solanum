import { describe, expect, it } from "vitest";
import { parseSessionFolder } from "@/lib/storage/folder";
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
