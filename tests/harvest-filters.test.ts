import { describe, expect, it } from "vitest";
import { harvestFilterOptions } from "@/lib/harvest/filters";
import { focusSession } from "./helpers/sessions";

const at = (day: number) => new Date(2026, 9, day, 9);

describe("what the harvest filters offer", () => {
  it("lists only tags and notes that finished crops actually use, sorted and without repeats", () => {
    const options = harvestFilterOptions([
      focusSession("a", at(1), 25, { tags: ["study", "deep"], notePath: "Projects/Beta.md" }),
      focusSession("b", at(2), 25, { tags: ["study"], notePath: "Projects/Alpha.md" }),
      focusSession("c", at(3), 25, { tags: ["work/client"], notePath: "Projects/Alpha.md" }),
    ]);
    expect(options.tags).toEqual(["deep", "study", "work/client"]);
    expect(options.notes).toEqual(["Projects/Alpha.md", "Projects/Beta.md"]);
  });

  it("ignores tags and notes that only stopped crops used, since nothing would show", () => {
    const options = harvestFilterOptions([
      focusSession("kept", at(1), 25, { tags: ["study"], notePath: "Kept.md" }),
      focusSession("stopped", at(2), 25, {
        status: "cancelled",
        focusEndedAt: null,
        tags: ["abandoned"],
        notePath: "Abandoned.md",
      }),
    ]);
    expect(options).toEqual({ tags: ["study"], notes: ["Kept.md"] });
  });

  it("offers nothing when there is no history, however many tags the vault has", () => {
    expect(harvestFilterOptions([])).toEqual({ tags: [], notes: [] });
  });

  it("does not offer a note for crops that have no linked note", () => {
    expect(harvestFilterOptions([focusSession("a", at(1), 25)]).notes).toEqual([]);
  });
});
