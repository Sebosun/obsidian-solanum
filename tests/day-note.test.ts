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
const carrot = focusSession("b", new Date(2026, 9, 31, 14, 30), 50, {
  crop: "carrot",
  status: "cancelled",
  focusEndedAt: null,
  intervals: [
    {
      start: new Date(2026, 9, 31, 14, 30).getTime(),
      end: new Date(2026, 9, 31, 14, 50).getTime(),
    },
  ],
});
const entries = (...sessions: (typeof tomato)[]): DayNoteEntry[] =>
  dailyHarvest(sessions, DAY, {}, NOW).entries;

const EXPECTED_BLOCK = `<!-- solanum:start -->
# Saturday, 31 October 2026

**45 min focused** · 2 sessions · 🍅 🥕

| Time | Crop | Focus | Status | Tags | Note |
| --- | --- | --- | --- | --- | --- |
| 09:00 | 🍅 Tomato | 25 min | Harvested | #study | [[Projects/Alpha]] |
| 14:30 | 🥕 Carrot | 20 min | Partial crop |  |  |

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
- **Status:** Partial crop
- **Time:** 14:30 – 14:50
- **Break:** 5 min
<!-- solanum:end -->`;

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

describe("writing the note into a file", () => {
  const note = buildDayNote(DAY, entries(tomato, carrot))!;
  const fresh = `---
solanum: day
date: 2026-10-31
focus_minutes: 45
sessions: 2
---
${EXPECTED_BLOCK}
`;

  it("creates a new file with frontmatter and the managed block", () => {
    expect(composeDayNote(null, note)).toBe(fresh);
  });

  it("is stable: composing again changes nothing", () => {
    expect(composeDayNote(fresh, note)).toBe(fresh);
  });

  it("refreshes only the managed parts and keeps everything the user wrote", () => {
    const stale = `---
mood: good
solanum: day
focus_minutes: 5
sessions: 1
aliases: [Halloween]
---
My own intro.

<!-- solanum:start -->
old content
<!-- solanum:end -->

## My thoughts
Went well.
`;
    const result = composeDayNote(stale, note);
    expect(result).toContain("mood: good\n");
    expect(result).toContain("aliases: [Halloween]\n");
    expect(result).toContain("focus_minutes: 45\n");
    expect(result).toContain("sessions: 2\n");
    expect(result).not.toContain("focus_minutes: 5\n");
    expect(result).not.toContain("old content");
    expect(result).toContain("My own intro.\n\n<!-- solanum:start -->");
    expect(result.endsWith("<!-- solanum:end -->\n\n## My thoughts\nWent well.\n")).toBe(true);
    expect(result.match(/^solanum: day$/gm)).toHaveLength(1);
  });

  it("adds frontmatter to a note that had none, keeping its text", () => {
    const result = composeDayNote(
      "Plain text.\n\n<!-- solanum:start -->\nx\n<!-- solanum:end -->\n",
      note,
    );
    expect(result.startsWith("---\nsolanum: day\n")).toBe(true);
    expect(result).toContain("Plain text.");
  });

  it("appends the block to an existing note that has no markers yet", () => {
    const result = composeDayNote("# My day\nSome thoughts.\n", note);
    expect(result.startsWith("---\nsolanum: day")).toBe(true);
    expect(result).toContain("# My day\nSome thoughts.\n\n<!-- solanum:start -->");
    expect(result.endsWith("<!-- solanum:end -->\n")).toBe(true);
  });
});
