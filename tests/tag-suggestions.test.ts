import { describe, expect, it } from "vitest";
import { tagSuggestions } from "@/lib/timer/suggestions";

const many = Array.from({ length: 60 }, (_, i) => `tag-${String(i).padStart(2, "0")}`);
const values = (items: { value: string }[]) => items.map((item) => item.value);

describe("the tags on offer", () => {
  it("are all of them, however many there are, sorted", () => {
    const shuffled = [...many].reverse();
    expect(values(tagSuggestions(shuffled, [], ""))).toEqual(many);
  });

  it("leave out only the ones already chosen", () => {
    const offered = values(tagSuggestions(many, ["tag-03", "tag-40"], ""));
    expect(offered).toHaveLength(58);
    expect(offered).not.toContain("tag-03");
    expect(offered).not.toContain("tag-40");
  });

  it("narrow to what matches what is typed, ignoring case and a leading #", () => {
    expect(values(tagSuggestions(["Work/Client", "study", "workout"], [], "#WORK"))).toEqual([
      "Work/Client",
      "workout",
    ]);
  });

  it("find a match anywhere in a tag, not only at its start", () => {
    expect(values(tagSuggestions(["a/deep/tag", "other"], [], "deep"))).toEqual(["a/deep/tag"]);
  });

  it("offer to create what is typed when nothing matches, once", () => {
    expect(values(tagSuggestions(many, [], "brand-new"))).toEqual(["brand-new"]);
    expect(tagSuggestions(many, ["brand-new"], "brand-new")).toEqual([]);
  });

  it("offer nothing when there are none and nothing is typed", () => {
    expect(tagSuggestions([], [], "")).toEqual([]);
  });
});
