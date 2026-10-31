import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESETS,
  MAX_PRESETS,
  effectiveDefaultMinutes,
  parsePresets,
} from "@/lib/timer/presets";
import { DEFAULT_SETTINGS, readSettings } from "@/lib/settings";

describe("focus presets", () => {
  it.each([
    ["5, 10, 25", [5, 10, 25]],
    ["25 10 5", [5, 10, 25]],
    ["15,15, 30 ,45", [15, 30, 45]],
    [" 90 ", [90]],
    ["1, 1440", [1, 1440]],
  ])("reads %j as %j", (input, presets) => {
    expect(parsePresets(input)).toEqual({ ok: true, presets });
  });

  it.each([
    ["", /at least one/i],
    ["  ,  ", /at least one/i],
    ["0, 25", /1 and 1440/],
    ["25, 1441", /1 and 1440/],
    ["2.5", /whole/i],
    ["ten", /whole/i],
    ["-5", /whole/i],
    ["1,2,3,4,5,6,7,8,9", new RegExp(`at most ${MAX_PRESETS}`, "i")],
  ])("rejects %j", (input, reason) => {
    const result = parsePresets(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it("keeps the saved default when it is still a preset, otherwise the closest one", () => {
    expect(effectiveDefaultMinutes([5, 25, 50], 25)).toBe(25);
    expect(effectiveDefaultMinutes([5, 25, 50], 30)).toBe(25);
    expect(effectiveDefaultMinutes([5, 25, 50], 45)).toBe(50);
    expect(effectiveDefaultMinutes([5, 15], 120)).toBe(15);
    expect(effectiveDefaultMinutes([10, 20], 15)).toBe(10);
  });

  it("is stored in settings, repaired when corrupt, and no longer limits the default", () => {
    expect(DEFAULT_SETTINGS.presets).toEqual(DEFAULT_PRESETS);
    expect(readSettings({ presets: [45, 15, 15, 30] }).presets).toEqual([15, 30, 45]);
    expect(readSettings({ presets: [] }).presets).toEqual(DEFAULT_PRESETS);
    expect(readSettings({ presets: [0, 3000] }).presets).toEqual(DEFAULT_PRESETS);
    expect(readSettings({ presets: "5,10" }).presets).toEqual(DEFAULT_PRESETS);
    expect(readSettings({ presets: [5, 15], defaultMinutes: 15 }).defaultMinutes).toBe(15);
    expect(readSettings({ defaultMinutes: 33 }).defaultMinutes).toBe(33);
    expect(readSettings({ defaultMinutes: 0 }).defaultMinutes).toBe(25);
  });
});
