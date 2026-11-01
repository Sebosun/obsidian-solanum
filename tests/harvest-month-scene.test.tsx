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

it("shows session details with arrow keys and dismisses them with Escape or when focus leaves", () => {
  resetCanvasStub("ready");
  const release = mount([
    focusSession("tomato", new Date(2026, 9, 3, 9), 25, {
      tags: ["study"],
      notePath: "Project.md",
    }),
    focusSession("carrot", new Date(2026, 9, 4, 10), 40, { crop: "carrot" }),
  ]);
  const scene = screen.getByRole("group", { name: "Harvest by session" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.keyDown(scene, { key: "ArrowRight" });
  let detail = screen.getByRole("tooltip");
  expect(detail.textContent).toContain("Tomato");
  expect(detail.textContent).toContain("25 min");
  expect(detail.textContent).toContain("study");
  expect(detail.textContent).toContain("Project.md");
  expect(detail.querySelector("time")?.getAttribute("dateTime")).toBe(
    new Date(2026, 9, 3, 9).toISOString(),
  );
  fireEvent.keyDown(scene, { key: "ArrowRight" });
  detail = screen.getByRole("tooltip");
  expect(detail.textContent).toContain("Carrot");
  expect(detail.textContent).toContain("40 min");
  expect(detail.textContent).not.toContain("Project.md");
  fireEvent.keyDown(scene, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.keyDown(scene, { key: "ArrowRight" });
  fireEvent.blur(scene);
  expect(screen.queryByRole("tooltip")).toBeNull();
  release();
});
