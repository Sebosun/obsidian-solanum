import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildForestRevisions,
  defaultForestMapping,
  matchNote,
  parseForestCsv,
  parseForestDate,
  previewForest,
  sanitizeTag,
  summarizeForestImport,
} from "@/lib/import/forest";
import { isRevision } from "@/lib/storage/validation";

const SAMPLE = readFileSync("tests/fixtures/forest-sample.csv", "utf8");
const MIN = 60_000;

describe("Forest dates", () => {
  it("reads the time with its own UTC offset, so the moment is exact in any timezone", () => {
    expect(parseForestDate("Wed Jul 28 12:53:32 GMT+02:00 2021")).toBe(
      Date.UTC(2021, 6, 28, 10, 53, 32),
    );
    expect(parseForestDate("Sat Nov 13 12:41:55 GMT+01:00 2021")).toBe(
      Date.UTC(2021, 10, 13, 11, 41, 55),
    );
    expect(parseForestDate("Sun Jan 03 00:10:00 GMT-05:00 2021")).toBe(
      Date.UTC(2021, 0, 3, 5, 10, 0),
    );
    expect(parseForestDate("Fri Dec 31 23:59:59 GMT+00:00 2021")).toBe(
      Date.UTC(2021, 11, 31, 23, 59, 59),
    );
  });

  it("rejects text that is not a Forest time", () => {
    for (const text of [
      "",
      "yesterday",
      "Wed Foo 28 12:53:32 GMT+02:00 2021",
      "Wed Jul 40 12:53:32 GMT+02:00 2021",
    ])
      expect(parseForestDate(text), text).toBeNull();
  });
});

describe("reading the CSV", () => {
  it("reads every row of a real export, with quoted fields", () => {
    const parse = parseForestCsv(SAMPLE);
    expect(parse.entries).toHaveLength(18);
    expect(parse.problems).toEqual([]);
    expect(parse.entries[0]).toMatchObject({ tag: "Study", tree: "Bush", note: "", success: true });
    expect(parse.entries[2].success).toBe(false);
    expect(parse.entries[0].end - parse.entries[0].start).toBe(25 * MIN);
  });

  it("copes with a byte-order mark, Windows line endings, quotes, commas and line breaks inside fields", () => {
    const csv =
      "﻿" +
      '"Start Time","End Time","Tag","Note","Tree Type","Is Success"\r\n' +
      '"Wed Jul 28 12:00:00 GMT+02:00 2021","Wed Jul 28 12:25:00 GMT+02:00 2021","Deep, work","He said ""go""\nthen did","Bush","True"\r\n' +
      "\r\n";
    const { entries } = parseForestCsv(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Deep, work");
    expect(entries[0].note).toBe('He said "go"\nthen did');
  });

  it("finds columns by name, so a different column order still works", () => {
    const csv =
      '"Is Success","Tree Type","Tag","Start Time","End Time"\n' +
      '"True","Cedar","Study","Wed Jul 28 12:00:00 GMT+02:00 2021","Wed Jul 28 12:30:00 GMT+02:00 2021"\n';
    const { entries } = parseForestCsv(csv);
    expect(entries[0]).toMatchObject({ tag: "Study", tree: "Cedar", success: true, note: "" });
  });

  it("reports unreadable rows by line instead of dropping them silently", () => {
    const csv =
      '"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n' +
      '"nonsense","Wed Jul 28 12:25:00 GMT+02:00 2021","Study","","Bush","True"\n' +
      '"Wed Jul 28 13:00:00 GMT+02:00 2021","Wed Jul 28 12:00:00 GMT+02:00 2021","Study","","Bush","True"\n' +
      '"Wed Jul 28 14:00:00 GMT+02:00 2021","Wed Jul 28 14:25:00 GMT+02:00 2021","Study","","Bush","True"\n';
    const parse = parseForestCsv(csv);
    expect(parse.entries).toHaveLength(1);
    expect(parse.problems).toEqual([
      { line: 2, reason: "The start time could not be read." },
      { line: 3, reason: "The session ends before it starts." },
    ]);
  });

  it.each([
    ["", /does not look like a Forest export/i],
    ["just,some,columns\n1,2,3\n", /does not look like a Forest export/i],
    ['"Start Time","Tag"\n"x","y"\n', /does not look like a Forest export/i],
  ])("rejects %j", (text, message) => {
    expect(() => parseForestCsv(text)).toThrow(message);
  });
});

describe("what the file contains", () => {
  it("counts finished and failed sessions and the span they cover", () => {
    const preview = previewForest(parseForestCsv(SAMPLE));
    expect(preview).toMatchObject({ total: 18, successful: 17, failed: 1 });
    expect(preview.first).toBe(Date.UTC(2021, 6, 28, 10, 53, 32));
    expect(preview.last).toBe(Date.UTC(2021, 10, 14, 14, 36, 10));
  });

  it("lists tags and trees of finished sessions only, most used first", () => {
    const preview = previewForest(parseForestCsv(SAMPLE));
    expect(preview.tags).toEqual([
      { name: "Study", count: 16 },
      { name: "Latin", count: 1 },
    ]);
    expect(preview.trees).toEqual([
      { name: "Bush", count: 10 },
      { name: "Cedar", count: 6 },
      { name: "Statue of Tada", count: 1 },
    ]);
  });
});

describe("turning Forest tags into Obsidian tags", () => {
  it.each([
    ["Study", "Study"],
    ["  deep work ", "deep-work"],
    ["#Latin", "Latin"],
    ["Café & Co.", "Café-Co"],
    ["Project/Alpha", "Project/Alpha"],
    ["Math, physics!", "Math-physics"],
    ["2021", ""],
    ["   ", ""],
    ["###", ""],
  ])("makes %j into %j", (input, tag) => {
    expect(sanitizeTag(input)).toBe(tag);
  });

  it("suggests the cleaned-up name for each tag and spreads trees over our crops by use", () => {
    const mapping = defaultForestMapping(previewForest(parseForestCsv(SAMPLE)));
    expect(mapping.tags).toEqual({ Study: "Study", Latin: "Latin" });
    expect(mapping.trees).toEqual({ Bush: "tomato", Cedar: "carrot", "Statue of Tada": "corn" });
  });

  it("starts over on the crops when there are more trees than crops", () => {
    const rows = ["Oak", "Elm", "Fir", "Ash", "Yew", "Box", "Birch"]
      .map(
        (tree, i) =>
          `"Wed Jul ${10 + i} 12:00:00 GMT+02:00 2021","Wed Jul ${10 + i} 12:25:00 GMT+02:00 2021","","","${tree}","True"`,
      )
      .join("\n");
    const csv = `"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n${rows}\n`;
    const { trees } = defaultForestMapping(previewForest(parseForestCsv(csv)));
    expect(Object.values(trees).sort()).toEqual([
      "apple",
      "carrot",
      "coconut",
      "corn",
      "pumpkin",
      "tomato",
      "tomato",
    ]);
  });
});

describe("matching a Forest note to a vault note", () => {
  const notes = ["Projects/Alpha.md", "Inbox.md", "Archive/Alpha.md", "Daily/Latin.md"];
  it.each([
    ["Projects/Alpha", "Projects/Alpha.md"],
    ["Projects/Alpha.md", "Projects/Alpha.md"],
    ["inbox", "Inbox.md"],
    ["Latin", "Daily/Latin.md"],
  ])("links %j to %j", (text, path) => {
    expect(matchNote(text, notes)).toBe(path);
  });

  it("does not guess when the name is ambiguous or unknown, or the note is just text", () => {
    expect(matchNote("Alpha", notes)).toBeNull();
    expect(matchNote("Read chapter 4 carefully", notes)).toBeNull();
    expect(matchNote("", notes)).toBeNull();
  });
});

describe("turning the sessions into harvests", () => {
  const preview = previewForest(parseForestCsv(SAMPLE));
  const mapping = {
    tags: { Study: "university", Latin: "" },
    trees: { Bush: "carrot", Cedar: "pumpkin", "Statue of Tada": "tomato" },
  } as const;
  const build = () =>
    buildForestRevisions(
      parseForestCsv(SAMPLE).entries,
      { ...mapping, tags: { ...mapping.tags }, trees: { ...mapping.trees } },
      {
        breakMs: 5 * MIN,
        resolveNote: () => null,
      },
    );

  it("makes one valid, finished session for each successful tree and skips the failed one", () => {
    const { revisions, failed } = build();
    expect(revisions).toHaveLength(17);
    expect(failed).toBe(1);
    expect(revisions.every((revision) => isRevision(revision))).toBe(true);
    expect(
      revisions.every((revision) => revision.status === "completed" && revision.phase === "done"),
    ).toBe(true);
    expect(revisions.every((revision) => revision.source === undefined)).toBe(true);
    expect(preview.successful).toBe(revisions.length);
  });

  it("keeps the real time and length of every session", () => {
    const [first] = build().revisions;
    expect(first.startedAt).toBe(Date.UTC(2021, 6, 28, 10, 53, 32));
    expect(first.focusEndedAt).toBe(Date.UTC(2021, 6, 28, 11, 18, 32));
    expect(first.durationMs).toBe(25 * MIN);
    expect(first.intervals).toEqual([{ start: first.startedAt, end: first.focusEndedAt }]);
    const long = build().revisions.find((revision) => revision.durationMs === 120 * MIN);
    expect(long).toBeDefined();
  });

  it("applies the chosen tags and crops", () => {
    const { revisions } = build();
    const latin = revisions[revisions.length - 1];
    expect(latin.tags).toEqual([]); // Latin was mapped to no tag
    expect(revisions[0].tags).toEqual(["university"]);
    expect(revisions[0].crop).toBe("carrot"); // Bush
    expect(revisions[1].crop).toBe("pumpkin"); // Cedar
    expect(revisions[revisions.length - 2].crop).toBe("tomato"); // Statue of Tada
  });

  it("cleans a tag the user typed, and merges two Forest tags into one", () => {
    const { revisions } = buildForestRevisions(
      parseForestCsv(SAMPLE).entries,
      { tags: { Study: "#uni work", Latin: "uni-work" }, trees: mapping.trees },
      { breakMs: 5 * MIN, resolveNote: () => null },
    );
    expect(new Set(revisions.map((revision) => revision.tags.join()))).toEqual(
      new Set(["uni-work"]),
    );
  });

  it("gives every session the same id on every import, so importing twice adds nothing", () => {
    const ids = build().revisions.map((revision) => revision.id);
    expect(ids).toEqual(build().revisions.map((revision) => revision.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^forest-[a-z0-9]+-[0-9a-f]{8}$/.test(id))).toBe(true);
  });

  it("links a note only when it matches a vault note, and counts the rest as dropped", () => {
    const csv =
      '"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n' +
      '"Wed Jul 28 12:00:00 GMT+02:00 2021","Wed Jul 28 12:25:00 GMT+02:00 2021","","Alpha","Bush","True"\n' +
      '"Wed Jul 28 13:00:00 GMT+02:00 2021","Wed Jul 28 13:25:00 GMT+02:00 2021","","remember to breathe","Bush","True"\n' +
      '"Wed Jul 28 14:00:00 GMT+02:00 2021","Wed Jul 28 14:25:00 GMT+02:00 2021","","","Bush","True"\n';
    const result = buildForestRevisions(
      parseForestCsv(csv).entries,
      { tags: {}, trees: { Bush: "tomato" } },
      { breakMs: 5 * MIN, resolveNote: (text) => matchNote(text, ["Projects/Alpha.md"]) },
    );
    expect(result.revisions.map((revision) => revision.notePath)).toEqual([
      "Projects/Alpha.md",
      null,
      null,
    ]);
    expect(result.notesDropped).toBe(1);
  });
});

describe("the summary", () => {
  const none = {
    imported: { added: 0, duplicates: 0, conflicts: [], invalid: 0, synthetic: 0 },
    failed: 0,
    invalidRows: 0,
    notesDropped: 0,
  };
  it.each([
    [
      { ...none, imported: { ...none.imported, added: 17 }, failed: 1 },
      "Imported 17 sessions from Forest. 1 stopped session was skipped.",
    ],
    [{ ...none, imported: { ...none.imported, added: 1 } }, "Imported 1 session from Forest."],
    [
      { ...none, imported: { ...none.imported, duplicates: 17 } },
      "Nothing new to import. 17 sessions were already here.",
    ],
    [
      {
        ...none,
        imported: { ...none.imported, added: 5, duplicates: 2 },
        failed: 3,
        invalidRows: 2,
        notesDropped: 4,
      },
      "Imported 5 sessions from Forest. 2 sessions were already here. 3 stopped sessions were skipped. 2 rows could not be read. 4 notes did not match a note in your vault and were left out.",
    ],
  ])("describes %j", (result, text) => {
    expect(summarizeForestImport(result)).toBe(text);
  });
});
