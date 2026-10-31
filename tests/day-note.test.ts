import { describe, expect, it } from "vitest";
import { buildDayNote, composeDayNote, type DayNoteEntry } from "@/lib/notes/dayNote";
import { dailyHarvest } from "@/lib/harvest/aggregate";
import { focusSession } from "./helpers/sessions";

const DAY = new Date(2026, 9, 31);
const NOW = new Date(2026, 10, 1).getTime();

const tomato = focusSession("a", new Date(2026, 9, 31, 9, 0), 25, {
  tags: ["study"],
  notePath: "Projects/Alpha.md",
});
const carrotStart = new Date(2026, 9, 31, 14, 30).getTime();
/** Paused after 20 minutes: still growing, so it counts and reads as "Growing". */
const carrot = focusSession("b", new Date(carrotStart), 50, {
  crop: "carrot",
  phase: "focus",
  status: "paused",
  focusEndedAt: null,
  deadline: null,
  remainingMs: 30 * 60_000,
  intervals: [{ start: carrotStart, end: carrotStart + 20 * 60_000 }],
});
const entries = (...sessions: (typeof tomato)[]): DayNoteEntry[] =>
  dailyHarvest(sessions, DAY, {}, NOW).entries;

const EXPECTED_BLOCK = `# Saturday, 31 October 2026

**45 min focused** · 2 sessions · 🍅 🥕

| Time | Crop | Focus | Status | Tags | Note |
| --- | --- | --- | --- | --- | --- |
| 09:00 | 🍅 Tomato | 25 min | Harvested | #study | [[Projects/Alpha]] |
| 14:30 | 🥕 Carrot | 20 min | Growing |  |  |

## Sessions

### 09:00 · 🍅 Tomato
- **Focus:** 25 min of 25 planned
- **Status:** Harvested
- **Time:** 09:00 – 09:25
- **Break:** 5 min
- **Tags:** #study
- **Note:** [[Projects/Alpha]]

### 14:30 · 🥕 Carrot
- **Focus:** 20 min of 50 planned
- **Status:** Growing
- **Time:** 14:30 – 14:50
- **Break:** 5 min`;

describe("a day's note", () => {
  it("summarises the day, lists sessions by start time and links notes and tags", () => {
    const note = buildDayNote(DAY, entries(carrot, tomato));
    expect(note?.block).toBe(EXPECTED_BLOCK);
    expect(note?.frontmatter).toEqual({
      solanum: "day",
      date: "2026-10-31",
      focus_minutes: 45,
      sessions: 2,
    });
  });

  it("is empty for a day with no focused time", () => {
    expect(buildDayNote(DAY, [])).toBeNull();
  });

  it("counts a crop that was grown more than once", () => {
    const again = focusSession("c", new Date(2026, 9, 31, 11, 0), 25);
    const note = buildDayNote(DAY, entries(tomato, again, carrot));
    expect(note?.block).toContain("**70 min focused** · 3 sessions · 🍅 ×2 🥕");
  });

  it("only credits this day with the time worked on it when a session crosses midnight", () => {
    const late = focusSession("late", new Date(2026, 9, 31, 23, 30), 60);
    const note = buildDayNote(DAY, entries(late));
    expect(note?.block).toContain("**30 min focused** · 1 session ·");
    expect(note?.block).toContain("- **Focus:** 30 min of 60 planned");
    expect(note?.block).toContain("- **Time:** 23:30 – 00:30 (next day)");
  });

  it("mentions pauses and a session still growing", () => {
    const start = new Date(2026, 9, 31, 8, 0).getTime();
    const paused = focusSession("p", new Date(start), 25, {
      phase: "focus",
      status: "running",
      focusEndedAt: null,
      deadline: start + 40 * 60_000,
      remainingMs: 10 * 60_000,
      intervals: [
        { start, end: start + 5 * 60_000 },
        { start: start + 10 * 60_000, end: null },
      ],
    });
    const note = buildDayNote(DAY, entries(paused));
    expect(note?.block).toContain("| Growing |");
    expect(note?.block).toContain("- **Pauses:** 1");
    expect(note?.block).toContain("- **Time:** 08:00 – now");
  });
});

describe("what the note leaves out", () => {
  it("skips accidental starts shorter than half a minute", () => {
    const start = new Date(2026, 9, 31, 13, 0).getTime();
    const accident = focusSession("oops", new Date(start), 1, {
      phase: "focus",
      status: "paused",
      focusEndedAt: null,
      deadline: null,
      remainingMs: 60_000,
      intervals: [{ start, end: start + 20_000 }],
    });
    const note = buildDayNote(DAY, entries(accident, tomato));
    expect(note?.block).toContain("**25 min focused** · 1 session ·");
    expect(note?.block).not.toContain("13:00");
    expect(buildDayNote(DAY, entries(accident))).toBeNull();
  });

  it("drops the Tags and Note columns when nothing in the day uses them", () => {
    const plain = focusSession("plain", new Date(2026, 9, 31, 10, 0), 25);
    const block = buildDayNote(DAY, entries(plain))!.block;
    expect(block).toContain("| Time | Crop | Focus | Status |\n| --- | --- | --- | --- |");
    expect(block).toContain("| 10:00 | 🍅 Tomato | 25 min | Harvested |");
    const tagged = buildDayNote(DAY, entries(plain, tomato))!.block;
    expect(tagged).toContain("| Time | Crop | Focus | Status | Tags | Note |");
  });

  it("writes no hidden markers, so nothing odd shows in the editor", () => {
    const block = buildDayNote(DAY, entries(tomato))!.block;
    expect(block).not.toContain("<!--");
    expect(block).not.toContain("%%");
  });
});

describe("writing the note into a file", () => {
  const note = buildDayNote(DAY, entries(tomato, carrot))!;
  const fresh = `---
solanum: day
date: 2026-10-31
focus_minutes: 45
sessions: 2
---
${EXPECTED_BLOCK}

## Notes
`;

  it("creates a new file with frontmatter, the summary and an empty Notes section", () => {
    expect(composeDayNote(null, note)).toBe(fresh);
  });

  it("is stable: composing again changes nothing", () => {
    expect(composeDayNote(fresh, note)).toBe(fresh);
  });

  it("refreshes the summary and keeps everything the user wrote", () => {
    const stale = `---
mood: good
solanum: day
focus_minutes: 5
sessions: 1
aliases: [Halloween]
---
My own intro.

# Saturday, 31 October 2026

old summary

## Sessions

### 08:00 · old
- **Focus:** 1 min of 5 planned

## Notes
Went well.

## Ideas
- ship it
`;
    const result = composeDayNote(stale, note);
    expect(result).toContain("mood: good\n");
    expect(result).toContain("aliases: [Halloween]\n");
    expect(result).toContain("focus_minutes: 45\n");
    expect(result).not.toContain("focus_minutes: 5\n");
    expect(result).not.toContain("old summary");
    expect(result).not.toContain("08:00 · old");
    expect(result).toContain("My own intro.\n\n# Saturday, 31 October 2026\n\n**45 min focused**");
    expect(result.endsWith("## Notes\nWent well.\n\n## Ideas\n- ship it\n")).toBe(true);
    expect(result.match(/^solanum: day$/gm)).toHaveLength(1);
  });

  it("stops refreshing at the next section even if the Notes heading was renamed", () => {
    const edited = fresh.replace("## Notes\n", "## My thoughts\nKeep this.\n");
    const result = composeDayNote(edited, buildDayNote(DAY, entries(tomato))!);
    expect(result).toContain("## My thoughts\nKeep this.\n");
    expect(result).toContain("**25 min focused**");
    expect(result).not.toContain("Carrot");
  });

  it("adds frontmatter and a Notes section to a note that had none", () => {
    const result = composeDayNote("# My day\nSome thoughts.\n", note);
    expect(result.startsWith("---\nsolanum: day")).toBe(true);
    expect(result).toContain("# My day\nSome thoughts.\n\n# Saturday, 31 October 2026");
    expect(result.endsWith("\n\n## Notes\n")).toBe(true);
  });

  it("migrates a note written with the old hidden markers, keeping the user's text", () => {
    const legacy = `---
solanum: day
date: 2026-10-31
focus_minutes: 5
sessions: 1
---
Intro.

<!-- solanum:start -->
# Saturday, 31 October 2026
stale
<!-- solanum:end -->

## My thoughts
Kept.
`;
    const result = composeDayNote(legacy, note);
    expect(result).not.toContain("<!--");
    expect(result).not.toContain("stale");
    expect(result).toContain("Intro.\n\n# Saturday, 31 October 2026\n\n**45 min focused**");
    expect(result.endsWith("\n\n## My thoughts\nKept.\n")).toBe(true);
  });
});
