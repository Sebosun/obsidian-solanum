// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestMonthScene } from "@/components/harvest/HarvestMonthScene";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { layoutHarvestBlocks } from "@/lib/harvest/month";
import type { SolanumHost } from "@/types/host";

const canvas = vi.hoisted(() => ({ mode: "loading" as "loading" | "ready" }));
const pending = vi.hoisted(() => new Promise(() => {}));
vi.mock("@react-three/fiber", () => ({
  Canvas: () => {
    if (canvas.mode === "loading") throw pending;
    return <div role="img" aria-label="Loaded blocks" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  canvas.mode = "loading";
});

function mount() {
  const timer = new TimerService(
    { readAll: async () => [], append: async () => {} },
    { now: Date.now, id: () => "unused" },
  );
  const host: SolanumHost = {
    timer,
    settings: DEFAULT_SETTINGS,
    saveSettings: vi.fn(),
    tags: () => [],
    notes: () => [],
    activeNote: () => null,
    openNote: vi.fn(),
    openSettings: vi.fn(),
    navigate: vi.fn(),
    assetUrl: (name) => name,
    unlockAudio: vi.fn(),
    previewSound: vi.fn(),
  };
  const layout = layoutHarvestBlocks([], new Date(2026, 9, 1));
  render(
    <AppStoreProvider store={getAppStore(host)}>
      <HarvestMonthScene layout={layout} season="summer" />
    </AppStoreProvider>,
  );
  return () => releaseAppStore(timer);
}

describe("month scene recovery", () => {
  it("replaces an indefinite wait with an explicit retry and can load afterward", async () => {
    vi.useFakeTimers();
    const release = mount();
    expect(screen.getByRole("status", { name: "Loading harvest" })).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(screen.getByText("Farm unavailable")).toBeTruthy();
    canvas.mode = "ready";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("img", { name: "Loaded blocks" })).toBeTruthy();
    release();
  });
});
