// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestMonthScene } from "@/components/scenes/HarvestMonthScene";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { layoutHarvestBlocks } from "@/lib/harvest/month";
import { emptyTimer } from "./helpers/timerEnvironment";
import { canvasStub, resetCanvasStub } from "./helpers/fiberStub";
import type { SolanumHost } from "@/types/host";

vi.mock("@react-three/fiber", async () => (await import("./helpers/fiberStub")).fiberStub());

beforeEach(() => resetCanvasStub("loading", "Loaded blocks"));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount() {
  const timer = emptyTimer();
  const host: SolanumHost = {
    timer,
    settings: DEFAULT_SETTINGS,
    saveSettings: vi.fn(),
    tags: () => [],
    notes: () => [],
    activeNote: () => null,
    noteTags: () => [],
    openNote: vi.fn(),
    openSettings: vi.fn(),
    navigate: vi.fn(),
    assetUrl: (name) => name,
    readAsset: async () => new ArrayBuffer(0),
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
    canvasStub.mode = "ready";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("img", { name: "Loaded blocks" })).toBeTruthy();
    release();
  });
});
