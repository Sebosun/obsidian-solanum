import { createStore } from "zustand/vanilla";
import type { TimerService } from "../lib/timer/TimerService";
import { normalizeTags } from "../lib/timer/selectors";
import type { SolanumHost } from "../types/host";
import type { AppState, AppStore } from "./types";

interface StoreEntry {
  store: AppStore;
  unsubscribe(): void;
}

const stores = new WeakMap<TimerService, StoreEntry>();

export function getAppStore(services: SolanumHost): AppStore {
  const existing = stores.get(services.timer);
  if (existing) return existing.store;

  const store = createStore<AppState>((set, get) => ({
    ...services.timer.getState(),
    services,
    draft: { minutes: services.settings.defaultMinutes, crop: "tomato", tags: "", note: "" },
    selectedSessionId: null,
    revealedRevisionId: null,
    busy: false,
    error: "",
    updateDraft(patch) {
      set({ draft: { ...get().draft, ...patch } });
    },
    selectSession(id) {
      set({ selectedSessionId: id });
    },
    revealControls(id) {
      set({ revealedRevisionId: id });
    },
    hideControls() {
      set({ revealedRevisionId: null });
    },
    clearError() {
      set({ error: "" });
    },
    async run(action) {
      if (get().busy) return;
      set({ busy: true, error: "" });
      try {
        await action();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      } finally {
        set({ busy: false });
      }
    },
    async startFocus() {
      services.unlockAudio();
      await get().run(async () => {
        const draft = get().draft;
        if (draft.note && !services.notes().includes(draft.note)) {
          throw new Error("Choose an existing note from this vault.");
        }
        await services.timer.start({
          crop: draft.crop,
          durationMs: draft.minutes * 60_000,
          breakMs: services.settings.breakMinutes * 60_000,
          autoBreak: services.settings.autoBreak,
          tags: normalizeTags(draft.tags.split(/[\s,]+/)),
          notePath: draft.note || null,
        });
      });
    },
  }));
  function syncSessions() {
    store.setState(services.timer.getState());
  }
  const unsubscribe = services.timer.subscribe(syncSessions);
  stores.set(services.timer, { store, unsubscribe });
  return store;
}

export function releaseAppStore(timer: TimerService): void {
  stores.get(timer)?.unsubscribe();
  stores.delete(timer);
}
