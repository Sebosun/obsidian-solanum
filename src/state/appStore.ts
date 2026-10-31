import { createStore } from "zustand/vanilla";
import type { TimerService } from "@/lib/timer/TimerService";
import type { Revision } from "@/lib/timer/types";
import { normalizeTags } from "@/lib/timer/selectors";
import type { SolanumHost } from "@/types/host";
import type { AppState, AppStore } from "@/state/types";

interface StoreEntry {
  store: AppStore;
  unsubscribe(): void;
}

/** Tags of the newest real session; seeded and debug history never leaks into the form. */
function rememberedTags(sessions: Revision[]): string[] {
  return sessions.find((session) => session.source === undefined)?.tags ?? [];
}

const stores = new WeakMap<TimerService, StoreEntry>();

export function getAppStore(services: SolanumHost): AppStore {
  const existing = stores.get(services.timer);
  if (existing) return existing.store;

  // Tags follow the latest real session until the user picks their own.
  let tagsChosen = false;
  const store = createStore<AppState>((set, get) => ({
    ...services.timer.getState(),
    services,
    draft: {
      minutes: services.settings.defaultMinutes,
      crop: "tomato",
      tags: rememberedTags(services.timer.getState().sessions),
      note: "",
    },
    selectedSessionId: null,
    revealedRevisionId: null,
    busy: false,
    error: "",
    celebration: null,
    activeViews: 0,
    registerView() {
      set({ activeViews: get().activeViews + 1 });
      return () => {
        const activeViews = Math.max(0, get().activeViews - 1);
        set({ activeViews });
        if (activeViews === 0) set({ celebration: null });
      };
    },
    claimCelebration(id) {
      const celebration = get().celebration;
      if (!celebration || celebration.id !== id || celebration.claimed) return false;
      set({ celebration: { ...celebration, claimed: true } });
      return true;
    },
    updateDraft(patch) {
      if (patch.tags) tagsChosen = true;
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
          tags: normalizeTags(draft.tags),
          notePath: draft.note || null,
        });
      });
    },
  }));
  function syncSessions() {
    const state = services.timer.getState();
    store.setState(state);
    if (!tagsChosen)
      store.setState({
        draft: { ...store.getState().draft, tags: rememberedTags(state.sessions) },
      });
  }
  const unsubscribe = services.timer.subscribe(syncSessions);
  const unsubscribeCompletion = services.timer.subscribeCompletion((event) => {
    if (event.phase !== "focus" || store.getState().activeViews === 0) return;
    store.setState({
      celebration: {
        id: `${event.sessionId}-${event.at}`,
        sessionId: event.sessionId,
        crop: event.crop,
        claimed: false,
      },
    });
  });
  function dispose() {
    unsubscribe();
    unsubscribeCompletion();
  }
  stores.set(services.timer, { store, unsubscribe: dispose });
  return store;
}

export function releaseAppStore(timer: TimerService): void {
  stores.get(timer)?.unsubscribe();
  stores.delete(timer);
}

export function updateDefaultMinutes(timer: TimerService, minutes: number): void {
  stores.get(timer)?.store.getState().updateDraft({ minutes });
}
