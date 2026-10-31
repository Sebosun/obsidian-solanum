// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestScene } from "@/components/harvest/HarvestScene";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { buildHarvestMonth } from "@/lib/harvest/model";
import type { SolanumHost } from "@/types/host";

const renderer = vi.hoisted(() => ({ loading: true, pending: new Promise(() => {}) }));
vi.mock("@react-three/fiber", () => ({
  Canvas: () => {
    if (renderer.loading) throw renderer.pending;
    return <div role="img" aria-label="Loaded farm" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("farm loading recovery", () => {
  it("replaces an indefinite wait with an explicit retry and can load afterward", async () => {
    vi.useFakeTimers();
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
    const days = buildHarvestMonth([], new Date(2026, 9, 1));
    renderer.loading = true;
    render(
      <AppStoreProvider store={getAppStore(host)}>
        <HarvestScene
          days={days}
          selectedKey={null}
          hoverKey={null}
          onHover={vi.fn()}
          onSelect={vi.fn()}
          onClear={vi.fn()}
        />
      </AppStoreProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading harvest" })).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(screen.getByText("Farm unavailable")).toBeTruthy();
    renderer.loading = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("img", { name: "Loaded farm" })).toBeTruthy();
    releaseAppStore(timer);
  });
});
