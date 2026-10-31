import { describe, expect, it } from "vitest";
import { knownTags, tagsToAdd } from "@/lib/timer/knownTags";

describe("the tags worth suggesting", () => {
  it("joins the vault's tags with those sessions used, each once", () => {
    const sessions = [{ tags: ["study", "deep"] }, { tags: ["deep", "work/client"] }];
    expect(knownTags(["study", "reading"], sessions).sort()).toEqual([
      "deep",
      "reading",
      "study",
      "work/client",
    ]);
  });

  it("copes with no sessions and no vault tags", () => {
    expect(knownTags([], [])).toEqual([]);
  });
});

describe("what a note's tags add to the chosen ones", () => {
  it("offers only tags not already chosen, with the hash stripped", () => {
    expect(tagsToAdd(["#study", "focus", "#focus"], ["study"])).toEqual(["focus"]);
  });

  it("offers nothing when everything is already chosen", () => {
    expect(tagsToAdd(["#a", "b"], ["a", "b"])).toEqual([]);
  });
});
