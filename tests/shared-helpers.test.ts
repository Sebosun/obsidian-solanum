import { describe, expect, it } from "vitest";
import { SerialQueue } from "@/lib/serialQueue";
import { errorMessage, plural } from "@/lib/text";
import { pad2, startOfDay, startOfNextDay } from "@/lib/time";
import { intervalEnd } from "@/lib/timer/selectors";
import { focusSession } from "./helpers/sessions";
import { ImportTracker } from "@/plugin/ImportTracker";

describe("plural", () => {
  it("counts with the singular only for one", () => {
    expect(plural(0, "session")).toBe("0 sessions");
    expect(plural(1, "session")).toBe("1 session");
    expect(plural(2, "session")).toBe("2 sessions");
    expect(plural(1, "entry was", "entries were")).toBe("1 entry was");
    expect(plural(3, "entry was", "entries were")).toBe("3 entries were");
  });
});

describe("errorMessage", () => {
  it("reads an Error's message and prints anything else", () => {
    expect(errorMessage(new Error("disk full"))).toBe("disk full");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(404)).toBe("404");
  });
});

describe("calendar helpers", () => {
  it("pads to two digits", () => {
    expect([pad2(0), pad2(7), pad2(12)]).toEqual(["00", "07", "12"]);
  });

  it("finds local midnights from the calendar, not from 24-hour steps", () => {
    const afternoon = new Date(2026, 9, 25, 15, 30).getTime();
    expect(startOfDay(afternoon)).toEqual(new Date(2026, 9, 25));
    expect(startOfDay(new Date(2026, 9, 25, 23, 59))).toEqual(new Date(2026, 9, 25));
    expect(startOfNextDay(new Date(2026, 9, 31))).toEqual(new Date(2026, 10, 1));
    expect(startOfNextDay(new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 1));
  });
});

describe("where a focus interval ends", () => {
  const NOW = new Date(2026, 9, 31, 12).getTime();
  const session = focusSession("a", new Date(2026, 9, 31, 9), 25);

  it("uses the recorded end when there is one", () => {
    expect(intervalEnd({ start: 1, end: 5 }, session, NOW)).toBe(5);
  });

  it("follows the clock while open, but never past the deadline", () => {
    const open = { start: 1, end: null };
    expect(intervalEnd(open, { ...session, deadline: NOW + 60_000 }, NOW)).toBe(NOW);
    expect(intervalEnd(open, { ...session, deadline: NOW - 60_000 }, NOW)).toBe(NOW - 60_000);
    expect(intervalEnd(open, { ...session, deadline: null }, NOW)).toBe(NOW);
  });
});

describe("serial queue", () => {
  it("runs actions in order, even when an earlier one is slower", async () => {
    const queue = new SerialQueue();
    const log: string[] = [];
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    await Promise.all([
      queue.run(async () => {
        await wait(15);
        log.push("slow");
      }),
      queue.run(async () => {
        log.push("fast");
      }),
    ]);
    expect(log).toEqual(["slow", "fast"]);
  });

  it("hands each caller its own result or failure and keeps going after a failure", async () => {
    const queue = new SerialQueue();
    const failed = queue.run(async () => {
      throw new Error("boom");
    });
    const next = queue.run(async () => "still running");
    await expect(failed).rejects.toThrow("boom");
    await expect(next).resolves.toBe("still running");
  });
});

describe("imports in progress", () => {
  it("marks sessions as importing only while the work runs", async () => {
    const imports = new ImportTracker();
    let release!: () => void;
    const work = imports.track(["a", "b"], () => new Promise<void>((done) => (release = done)));
    expect(imports.isImporting("a")).toBe(true);
    expect(imports.isImporting("c")).toBe(false);
    release();
    await work;
    expect(imports.isImporting("a")).toBe(false);
    expect(imports.isImporting("b")).toBe(false);
  });

  it("keeps a session marked until every overlapping import of it has finished", async () => {
    const imports = new ImportTracker();
    const releases: (() => void)[] = [];
    const pending = () => new Promise<void>((done) => releases.push(done));
    const first = imports.track(["a"], pending);
    const second = imports.track(["a"], pending);
    releases[0]();
    await first;
    expect(imports.isImporting("a")).toBe(true);
    releases[1]();
    await second;
    expect(imports.isImporting("a")).toBe(false);
  });

  it("clears the marks and passes the error on when the import fails", async () => {
    const imports = new ImportTracker();
    await expect(
      imports.track(["a"], async () => {
        throw new Error("vault is read-only");
      }),
    ).rejects.toThrow("read-only");
    expect(imports.isImporting("a")).toBe(false);
  });
});
