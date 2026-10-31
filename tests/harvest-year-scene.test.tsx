// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HarvestYearScene } from "@/components/harvest/HarvestYearScene";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { adjacentBed } from "@/lib/harvest/navigation";
import { layoutYearStacks, summarizeYear } from "@/lib/harvest/year";
import { focusSession } from "./helpers/sessions";
import type { SolanumHost } from "@/types/host";

const canvas = vi.hoisted(() => ({ mode: "ready" as "ready" | "failing" }));
vi.mock("@react-three/fiber", () => ({
  Canvas: () => {
    if (canvas.mode === "failing") throw new Error("WebGL context unavailable");
    return <div role="img" aria-label="Loaded crates" />;
  },
}));

afterEach(() => {
  cleanup();
  canvas.mode = "ready";
});

const NOW = new Date(2027, 0, 1).getTime();
const months = summarizeYear(
  [focusSession("a", new Date(2026, 2, 3, 9), 60), focusSession("b", new Date(2026, 9, 5, 9), 25)],
  2026,
  {},
  NOW,
);
const layout = layoutYearStacks(months);

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
  const onOpenMonth = vi.fn();
  render(
    <AppStoreProvider store={getAppStore(host)}>
      <HarvestYearScene year={2026} months={months} layout={layout} onOpenMonth={onOpenMonth} />
    </AppStoreProvider>,
  );
  return { onOpenMonth, release: () => releaseAppStore(timer) };
}

describe("year scene", () => {
  it("falls back to a readable month list that still opens a month", () => {
    canvas.mode = "failing";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { onOpenMonth, release } = mount();
    expect(screen.getByText("Farm unavailable")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Harvest by month, 2026" });
    expect(within(list).getAllByRole("button")).toHaveLength(12);
    expect(within(list).getByText("1 h")).toBeTruthy();
    fireEvent.click(within(list).getByRole("button", { name: "March 2026, 60 focused minutes" }));
    expect(onOpenMonth).toHaveBeenCalledWith(2);
    release();
  });

  it("opens a stack with the keyboard: arrows move across and down, Enter opens, Escape lets go", () => {
    const { onOpenMonth, release } = mount();
    const group = screen.getByRole("group", { name: "Harvest by month" });
    fireEvent.keyDown(group, { key: "Enter" });
    expect(onOpenMonth).not.toHaveBeenCalled();
    fireEvent.keyDown(group, { key: "ArrowRight" }); // first press lands on January
    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowDown" });
    fireEvent.keyDown(group, { key: "Enter" });
    expect(onOpenMonth).toHaveBeenLastCalledWith(5); // January, February, then a row down
    fireEvent.keyDown(group, { key: "Escape" });
    fireEvent.keyDown(group, { key: "Enter" });
    expect(onOpenMonth).toHaveBeenCalledTimes(1);
    release();
  });
});

describe("moving between stacks", () => {
  it.each([
    [null, "ArrowRight", 0],
    [0, "ArrowRight", 1],
    [3, "ArrowRight", 3],
    [4, "ArrowLeft", 4],
    [5, "ArrowLeft", 4],
    [1, "ArrowDown", 5],
    [10, "ArrowDown", 10],
    [5, "ArrowUp", 1],
    [1, "ArrowUp", 1],
    [8, "ArrowDown", 8],
    [7, "ArrowDown", 11],
  ])("from %s, %s goes to %s", (from, key, to) => {
    expect(adjacentBed(from, key, 4, 12)).toBe(to);
  });

  it("ignores every other key", () => {
    expect(adjacentBed(4, "a", 4, 12)).toBeNull();
  });
});
