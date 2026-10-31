import { describe, expect, it } from "vitest";
import { SessionExchange } from "@/lib/storage/SessionExchange";
import { buildExport, parseExport, summarizeImport } from "@/lib/storage/exchange";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { TimerService } from "@/lib/timer/TimerService";
import { seedMonth } from "@/lib/debug/seeder";
import { MemoryDisk } from "./helpers/memoryDisk";

const FOLDER = "Solanum/sessions";
const NOW = new Date(2026, 9, 31, 12).getTime();

function vault(label: string) {
  const disk = new MemoryDisk();
  const store = new VaultSessionStore(disk, { folder: FOLDER, debug: true });
  let now = NOW;
  let sequence = 0;
  const timer = new TimerService(store, { now: () => now, id: () => `${label}-${++sequence}` });
  const exchange = new SessionExchange(disk, store, timer, () => NOW);
  return { disk, store, timer, exchange, advance: (ms: number) => (now += ms) };
}

async function plant(v: ReturnType<typeof vault>, tags: string[]) {
  const id = await v.timer.start({
    durationMs: 25 * 60_000,
    breakMs: 5 * 60_000,
    autoBreak: false,
    tags,
    notePath: "Project.md",
    crop: "carrot",
  });
  v.advance(10 * 60_000);
  await v.timer.pause(id);
  v.advance(60_000);
  await v.timer.resume(id);
  return id;
}

describe("exporting sessions", () => {
  it("writes every real revision to a dated file in the vault", async () => {
    const v = vault("a");
    await plant(v, ["study"]);
    const result = await v.exchange.export();
    expect(result).toEqual({ path: "Solanum/exports/solanum-sessions-2026-10-31.json", count: 3 });
    const bundle = parseExport(v.disk.files.get(result.path)!);
    expect(bundle.revisions).toHaveLength(3);
    expect(bundle.invalid).toBe(0);
  });

  it("never overwrites an earlier export from the same day", async () => {
    const v = vault("a");
    await plant(v, []);
    const first = await v.exchange.export();
    const second = await v.exchange.export();
    expect(second.path).not.toBe(first.path);
    expect(v.disk.files.has(first.path)).toBe(true);
    expect(v.disk.files.has(second.path)).toBe(true);
  });

  it("leaves simulated and demo history out of the file", async () => {
    const v = vault("a");
    await plant(v, []);
    for (const seed of seedMonth(new Date(2026, 9, 1), NOW).slice(0, 3)) await v.store.append(seed);
    await v.store.append({
      ...(await v.store.readAll())[0],
      id: "dbg",
      sessionId: "dbg",
      source: "debug",
    });
    const { path } = await v.exchange.export();
    const exported = parseExport(v.disk.files.get(path)!).revisions;
    expect(exported.every((revision) => revision.source === undefined)).toBe(true);
    expect(exported).toHaveLength(3);
  });

  it("orders revisions deterministically so equal data gives equal files", () => {
    const revisions = seedMonth(new Date(2026, 9, 1), NOW)
      .slice(0, 4)
      .map((r) => ({ ...r, source: undefined }));
    const forward = buildExport(revisions, NOW);
    const reversed = buildExport([...revisions].reverse(), NOW);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
  });
});

describe("importing sessions", () => {
  it("restores the full history into an empty vault", async () => {
    const source = vault("a");
    const first = await plant(source, ["study"]);
    await source.timer.cancel(first);
    await plant(source, ["work"]);
    const total = (await source.store.readAll()).length;
    const { path } = await source.exchange.export();
    const target = vault("b");
    const result = await target.exchange.import(source.disk.files.get(path)!);
    expect(total).toBe(7);
    expect(result).toMatchObject({ added: total, duplicates: 0, conflicts: [], invalid: 0 });
    expect(target.timer.getState().sessions).toEqual(source.timer.getState().sessions);
    expect([...target.disk.files.keys()].sort()).toEqual(
      [...source.disk.files.keys()].filter((p) => p.startsWith(FOLDER)).sort(),
    );
  });

  it("is idempotent: importing the same file again adds nothing", async () => {
    const source = vault("a");
    await plant(source, []);
    const { path } = await source.exchange.export();
    const text = source.disk.files.get(path)!;
    const target = vault("b");
    await target.exchange.import(text);
    const again = await target.exchange.import(text);
    expect(again).toMatchObject({ added: 0, duplicates: 3, conflicts: [] });
  });

  it("keeps both sides of an offline edit as a sync conflict instead of picking one", async () => {
    const left = vault("l");
    const id = await plant(left, ["study"]);
    const { path } = await left.exchange.export();
    const right = vault("r");
    await right.exchange.import(left.disk.files.get(path)!);
    left.advance(60_000);
    await left.timer.pause(id);
    right.advance(20 * 60_000);
    await right.timer.cancel(id);
    const leftExport = await left.exchange.export();
    const result = await right.exchange.import(left.disk.files.get(leftExport.path)!);
    expect(result.added).toBe(1);
    expect(right.timer.getState().conflicts).toHaveLength(1);
    expect(right.timer.getState().conflicts[0].versions).toHaveLength(2);
  });

  it("reports a same-id revision with different content and leaves the local copy alone", async () => {
    const source = vault("a");
    await plant(source, []);
    const target = vault("b");
    const { path } = await source.exchange.export();
    await target.exchange.import(source.disk.files.get(path)!);
    const bundle = JSON.parse(source.disk.files.get(path)!);
    bundle.sessions[0] = { ...bundle.sessions[0], tags: ["tampered"] };
    const [original] = [...target.disk.files.entries()];
    const result = await target.exchange.import(JSON.stringify(bundle));
    expect(result.conflicts).toEqual([bundle.sessions[0].id]);
    expect(target.disk.files.get(original[0])).toBe(original[1]);
  });

  it("accepts a bare list or a single revision, and counts unusable entries", async () => {
    const [valid] = seedMonth(new Date(2026, 9, 1), NOW).map((r) => ({ ...r, source: undefined }));
    const target = vault("t");
    const list = await target.exchange.import(JSON.stringify([valid, { nonsense: true }]));
    expect(list).toMatchObject({ added: 1, invalid: 1 });
    const other = { ...valid, id: "other", sessionId: "other" };
    expect(await target.exchange.import(JSON.stringify(other))).toMatchObject({ added: 1 });
  });

  it("skips simulated revisions found in a file, since production history stays real", async () => {
    const [seed] = seedMonth(new Date(2026, 9, 1), NOW);
    const target = vault("t");
    const result = await target.exchange.import(JSON.stringify([seed]));
    expect(result).toMatchObject({ added: 0, synthetic: 1 });
  });

  it.each([
    ["not json at all", /valid Solanum/i],
    ['{"format":"something-else","version":1,"sessions":[]}', /valid Solanum/i],
    ['{"format":"solanum-sessions","version":99,"sessions":[]}', /newer|version/i],
    ["42", /valid Solanum/i],
  ])("rejects %j without touching the vault", async (text, message) => {
    const target = vault("t");
    await expect(target.exchange.import(text)).rejects.toThrow(message);
    expect(target.disk.files.size).toBe(0);
  });
});

describe("import summary", () => {
  const none = { added: 0, duplicates: 0, conflicts: [], invalid: 0, synthetic: 0 };
  it.each([
    [{ ...none, added: 12 }, "Imported 12 revisions."],
    [{ ...none, added: 1 }, "Imported 1 revision."],
    [{ ...none, duplicates: 3 }, "Nothing new to import. 3 revisions were already here."],
    [{ ...none }, "Nothing new to import."],
    [
      { ...none, added: 2, duplicates: 1, conflicts: ["x"], invalid: 2, synthetic: 4 },
      "Imported 2 revisions. 1 revision was already here. 1 revision differs from your copy and was kept as is. 2 entries were not valid sessions. 4 demo or debug entries were ignored.",
    ],
  ])("describes %j", (result, text) => {
    expect(summarizeImport(result)).toBe(text);
  });
});
