// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { monthInsights } from "@/lib/harvest/insights";
import { HarvestMonthBody } from "@/components/harvest/HarvestMonthBody";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { summarizeMonth, layoutHarvestBlocks } from "@/lib/harvest/month";
import { emptyTimer } from "./helpers/timerEnvironment";
import { canvasStub, resetCanvasStub } from "./helpers/fiberStub";
import type { SolanumHost } from "@/types/host";
import type { Revision } from "@/lib/timer/types";
import { focusSession } from "./helpers/sessions";

vi.mock("@react-three/fiber", async () => (await import("./helpers/fiberStub")).fiberStub());

beforeEach(() => resetCanvasStub("loading", "Loaded blocks"));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(sessions: Revision[] = []) {
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
  const layout = layoutHarvestBlocks(
    sessions,
    new Date(2026, 9, 1),
    {},
    new Date(2026, 10, 1).getTime(),
  );
  render(
    <AppStoreProvider store={getAppStore(host)}>
      <HarvestMonthBody
        month={new Date(2026, 9, 1)}
        layout={layout}
        summary={summarizeMonth(
          sessions,
          new Date(2026, 9, 1),
          {},
          new Date(2026, 10, 1).getTime(),
        )}
        insights={monthInsights(
          sessions,
          new Date(2026, 9, 1),
          {},
          new Date(2026, 10, 1).getTime(),
        )}
        season="summer"
        filtered={false}
        onClearFilters={vi.fn()}
        onStartFocus={vi.fn()}
      />
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

it("keeps month analysis visible without crop inspection or session browsing", () => {
  resetCanvasStub("ready");
  const release = mount([
    focusSession("tomato", new Date(2026, 9, 3, 9), 25, {
      tags: ["study"],
      notePath: "Project.md",
    }),
    focusSession("prior", new Date(2026, 8, 3, 9), 50),
  ]);
  const scene = screen.getByRole("group", { name: "Harvest by session" });
  const summary = screen.getByRole("region", { name: "Month summary" });
  expect(scene.contains(summary)).toBe(false);
  expect(screen.getByRole("img", { name: "Daily focus" })).toBeTruthy();
  expect(screen.getByText("50% less focused time")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Most focused weekdays" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Most focused time of day" })).toBeTruthy();
  expect(screen.getByRole("list", { name: "Tags" }).textContent).toContain("study");
  expect(screen.getByRole("list", { name: "Notes" }).textContent).toContain("Project.md");
  fireEvent.pointerOver(scene);
  fireEvent.click(scene);
  fireEvent.keyDown(scene, { key: "ArrowRight" });
  expect(screen.queryByRole("region", { name: "Harvest details" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next harvest" })).toBeNull();
  expect(screen.getByRole("region", { name: "Month summary" })).toBe(summary);
  release();
});
