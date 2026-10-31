import { describe, expect, it, vi } from "vitest";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import type { Revision } from "@/lib/timer/types";
import type { SolanumHost } from "@/types/host";
import { DEFAULT_SETTINGS } from "@/lib/settings";

function fixture() {
  const files = new Map<string, Revision>();
  let sequence = 0;
  const timer = new TimerService(
    {
      readAll: async () => [...files.values()],
      append: async (revision) => {
        files.set(revision.id, revision);
      },
    },
    { now: Date.now, id: () => `store-${++sequence}` },
  );
  const host: SolanumHost = {
    timer,
    settings: { ...DEFAULT_SETTINGS },
    tags: () => [],
    notes: () => [],
    activeNote: () => null,
    openNote: vi.fn(),
    navigate: vi.fn(),
    assetUrl: (file) => file,
    unlockAudio: vi.fn(),
    previewSound: vi.fn(),
    openSettings: vi.fn(),
    saveSettings: vi.fn(),
  };
  return { host, files };
}

describe("shared application store", () => {
  it("drops pending visual effects when views close without touching persisted crops", async () => {
    const { host } = fixture();
    const store = getAppStore(host);
    const closeView = store.getState().registerView();
    await store.getState().startFocus();
    store.setState({
      celebration: { id: "cue", sessionId: "session", crop: "tomato", claimed: false },
    });
    closeView();
    expect(store.getState().celebration).toBeNull();
    expect(store.getState().sessions[0].status).toBe("running");
    releaseAppStore(host.timer);
  });

  it("claims a completion animation once across sidebar remounts", async () => {
    const { host } = fixture();
    const store = getAppStore(host);
    store.setState({
      celebration: { id: "new-harvest", sessionId: "session", crop: "tomato", claimed: false },
    });
    expect(store.getState().claimCelebration("new-harvest")).toBe(true);
    expect(getAppStore(host).getState().claimCelebration("new-harvest")).toBe(false);
    releaseAppStore(host.timer);
  });

  it("shares session state and the draft across views, without resetting when a view remounts", async () => {
    const { host } = fixture();
    const timerView = getAppStore(host);
    const harvestView = getAppStore(host);
    timerView.getState().updateDraft({ crop: "corn", minutes: 10 });
    await timerView.getState().startFocus();
    expect(harvestView.getState().sessions[0].crop).toBe("corn");
    expect(getAppStore(host).getState().draft.minutes).toBe(10);
    releaseAppStore(host.timer);
  });

  it("keeps storage errors and action locking in one place and never publishes unsaved work", async () => {
    const { host } = fixture();
    const store = getAppStore(host);
    await Promise.all([store.getState().startFocus(), store.getState().startFocus()]);
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().busy).toBe(false);
    await store.getState().run(async () => {
      throw new Error("Storage unavailable");
    });
    expect(store.getState().error).toBe("Storage unavailable");
    expect(store.getState().sessions).toHaveLength(1);
    releaseAppStore(host.timer);
  });

  it("releases timer subscriptions when the plugin unloads", async () => {
    const { host } = fixture();
    const store = getAppStore(host);
    const changes = vi.fn();
    store.subscribe(changes);
    releaseAppStore(host.timer);
    await host.timer.start({
      durationMs: 300_000,
      breakMs: 300_000,
      autoBreak: false,
      tags: [],
      notePath: null,
    });
    expect(changes).not.toHaveBeenCalled();
  });

  describe("remembered tags", () => {
    const start = (host: SolanumHost, tags: string[]) =>
      host.timer.start({
        durationMs: 300_000,
        breakMs: 300_000,
        autoBreak: false,
        tags,
        notePath: null,
      });

    it("prefills the draft with the tags of the most recent session on load", async () => {
      const { host, files } = fixture();
      await start(host, ["study", "deep-work"]);
      await host.timer.cancel(host.timer.getState().sessions[0].sessionId);
      const [first] = [...files.values()];
      files.set("seed-1", {
        ...first,
        id: "seed-1",
        sessionId: "seed-1",
        tags: ["demo"],
        startedAt: first.startedAt + 1,
        source: "seed",
      });
      await host.timer.refresh();
      const store = getAppStore(host);
      expect(store.getState().draft.tags).toEqual(["study", "deep-work"]);
      releaseAppStore(host.timer);
    });

    it("fills the draft when history arrives after the view opened", async () => {
      const { host } = fixture();
      const store = getAppStore(host);
      expect(store.getState().draft.tags).toEqual([]);
      await start(host, ["study"]);
      expect(store.getState().draft.tags).toEqual(["study"]);
      releaseAppStore(host.timer);
    });

    it("never overwrites tags the user has already chosen", async () => {
      const { host } = fixture();
      const store = getAppStore(host);
      store.getState().updateDraft({ tags: ["mine"] });
      await start(host, ["study"]);
      expect(store.getState().draft.tags).toEqual(["mine"]);
      releaseAppStore(host.timer);
    });

    it("starts the next crop with the remembered tags", async () => {
      const { host } = fixture();
      await start(host, ["study"]);
      await host.timer.cancel(host.timer.getState().sessions[0].sessionId);
      const store = getAppStore(host);
      await store.getState().startFocus();
      expect(store.getState().sessions[0].tags).toEqual(["study"]);
      releaseAppStore(host.timer);
    });
  });
});
