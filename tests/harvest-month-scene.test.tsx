// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

it("browses sessions below the scene without targeting crops, preserves details on leave, and restores totals", () => {
  resetCanvasStub("ready");
  const release = mount([
    focusSession("tomato", new Date(2026, 9, 3, 9), 25, {
      tags: ["study"],
      notePath: "Project.md",
    }),
    focusSession("carrot", new Date(2026, 9, 4, 10), 40, { crop: "carrot" }),
  ]);
  const scene = screen.getByRole("group", { name: "Harvest by session" });
  expect(screen.queryByRole("region", { name: "Harvest details" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next harvest" }));
  let detail = screen.getByRole("region", { name: "Harvest details" });
  expect(scene.contains(detail)).toBe(false);
  expect(screen.queryByRole("region", { name: "Month summary" })).toBeNull();
  fireEvent.pointerLeave(scene);
  fireEvent.blur(scene);
  expect(screen.getByRole("region", { name: "Harvest details" })).toBe(detail);
  expect(detail.textContent).toContain("Tomato");
  expect(detail.textContent).toContain("25 min");
  expect(detail.textContent).toContain("study");
  expect(detail.textContent).toContain("Project.md");
  expect(detail.querySelector("time")?.getAttribute("dateTime")).toBe(
    new Date(2026, 9, 3, 9).toISOString(),
  );
  fireEvent.keyDown(scene, { key: "ArrowRight" });
  detail = screen.getByRole("region", { name: "Harvest details" });
  expect(detail.textContent).toContain("Carrot");
  expect(detail.textContent).toContain("40 min");
  expect(detail.textContent).not.toContain("Project.md");
  fireEvent.keyDown(scene, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "Harvest details" })).toBeNull();
  expect(screen.getByRole("region", { name: "Month summary" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Previous harvest" }));
  expect(screen.getByRole("region", { name: "Harvest details" }).textContent).toContain("Carrot");
  fireEvent.click(screen.getByRole("button", { name: "Month summary" }));
  expect(screen.queryByRole("region", { name: "Harvest details" })).toBeNull();
  expect(screen.getByRole("region", { name: "Month summary" })).toBeTruthy();
  release();
});
