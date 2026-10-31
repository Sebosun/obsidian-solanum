import { describe, expect, it } from "vitest";
import { TimerService, type Revision, type SessionStore } from "../src/timer";

const MIN = 60_000;

class SharedStore implements SessionStore {
  files = new Map<string, Revision>();
  async readAll() { return [...this.files.values()].map((r) => structuredClone(r)); }
  async append(revision: Revision) { this.files.set(revision.id, structuredClone(revision)); }
}

function setup(store = new SharedStore(), device = "desktop") {
  let now = new Date("2026-10-31T12:00:00Z").getTime();
  let sequence = 0;
  const signals: string[] = [];
  const service = new TimerService(store, {
    now: () => now,
    id: () => `${device}-${++sequence}`,
    notify: (phase) => signals.push(phase),
  });
  return { service, store, signals, advance: (ms: number) => { now += ms; } };
}

const options = { durationMs: 25 * MIN, breakMs: 5 * MIN, autoBreak: false, tags: ["#work/client"], notePath: "Projects/Client.md" };

describe("persistent focus workflows", () => {
  it("restores elapsed growth on another device without a running sidebar", async () => {
    const desktop = setup();
    await desktop.service.refresh();
    const id = await desktop.service.start(options);
    const mobile = setup(desktop.store, "mobile");
    mobile.advance(10 * MIN);
    await mobile.service.refresh();
    const restored = mobile.service.getState().sessions[0];
    expect(restored.sessionId).toBe(id);
    expect(mobile.service.remaining(restored)).toBe(15 * MIN);
    expect(restored.tags).toEqual(["work/client"]);
    expect(restored.notePath).toBe("Projects/Client.md");
    expect(mobile.signals).toEqual([]);
  });

  it("persists pauses and excludes paused time from focus and the deadline", async () => {
    const a = setup();
    const id = await a.service.start(options);
    a.advance(5 * MIN);
    await a.service.pause(id);
    const b = setup(a.store, "mobile");
    b.advance(60 * MIN);
    await b.service.refresh();
    expect(b.service.remaining(b.service.getState().sessions[0])).toBe(20 * MIN);
    await b.service.resume(id);
    b.advance(20 * MIN);
    await b.service.tick();
    const session = b.service.getState().sessions[0];
    expect(session.phase).toBe("break");
    expect(session.status).toBe("waiting");
    expect(session.intervals.reduce((sum, i) => sum + (i.end! - i.start), 0)).toBe(25 * MIN);
    expect(b.signals).toEqual(["focus"]);
  });

  it("recovers expired focus and automatic break once without phantom sessions or stale sounds", async () => {
    const a = setup();
    await a.service.start({ ...options, autoBreak: true });
    const b = setup(a.store, "mobile");
    b.advance(120 * MIN);
    await b.service.refresh();
    expect(b.service.getState().sessions).toHaveLength(1);
    expect(b.service.getState().sessions[0]).toMatchObject({ phase: "done", status: "completed" });
    const count = a.store.files.size;
    await b.service.refresh();
    await b.service.tick();
    expect(a.store.files.size).toBe(count);
    expect(b.signals).toEqual([]);
  });

  it("waits indefinitely for a manual break and starts it from the user's action", async () => {
    const a = setup();
    const id = await a.service.start(options);
    a.advance(90 * MIN);
    await a.service.refresh();
    await a.service.startBreak(id);
    expect(a.service.remaining(a.service.getState().sessions[0])).toBe(5 * MIN);
    a.advance(5 * MIN);
    await a.service.tick();
    await a.service.tick();
    expect(a.signals).toEqual(["break"]);
  });

  it("preserves cancelled partial work and refuses overlapping local starts", async () => {
    const a = setup();
    const id = await a.service.start(options);
    await expect(a.service.start(options)).rejects.toThrow(/active/i);
    a.advance(3 * MIN);
    await a.service.cancel(id);
    const session = a.service.getState().sessions[0];
    expect(session.status).toBe("cancelled");
    expect(session.intervals[0].end! - session.intervals[0].start).toBe(3 * MIN);
    await a.service.start(options);
    expect(a.service.getState().sessions).toHaveLength(2);
  });

  it("preserves independent offline sessions and detects concurrent revisions", async () => {
    const a = setup();
    const id = await a.service.start(options);
    const offline = setup(undefined, "offline");
    await offline.service.start(options);
    for (const [key, value] of offline.store.files) a.store.files.set(key, value);
    await a.service.refresh();
    expect(a.service.getState().sessions).toHaveLength(2);

    // Two devices pause the same parent without observing each other's edit.
    const forkStore = new SharedStore();
    for (const [key, value] of a.store.files) forkStore.files.set(key, value);
    const b = setup(forkStore, "mobile");
    await b.service.refresh();
    a.advance(MIN);
    b.advance(2 * MIN);
    await a.service.pause(id);
    await b.service.pause(id);
    for (const [key, value] of forkStore.files) a.store.files.set(key, value);
    await a.service.refresh();
    const conflict = a.service.getState().conflicts[0];
    expect(conflict.versions).toHaveLength(2);
    await expect(a.service.resume(id)).rejects.toThrow(/conflict/i);
    await a.service.resolve(id, conflict.versions[0].id);
    expect(a.service.getState().conflicts).toHaveLength(0);
    expect(a.service.getState().sessions).toHaveLength(2);
  });

  it("does not publish unsaved transitions when storage fails", async () => {
    const a = setup();
    const id = await a.service.start(options);
    a.store.append = async () => { throw new Error("disk full"); };
    await expect(a.service.pause(id)).rejects.toThrow("disk full");
    expect(a.service.getState().sessions[0].status).toBe("running");
  });

  it("serializes rapid actions so double start cannot plant twice", async () => {
    const a = setup();
    const result = await Promise.allSettled([a.service.start(options), a.service.start(options)]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(a.service.getState().sessions).toHaveLength(1);
  });
});
