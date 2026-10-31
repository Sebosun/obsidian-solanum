// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HarvestScene } from "@/components/harvest/HarvestScene";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { buildHarvestMonth } from "@/lib/harvest/model";
import type { SolanumHost } from "@/types/host";

const renderer = vi.hoisted(() => ({ failing: false }));
vi.mock("@react-three/fiber", () => ({
  Canvas: () => {
    if (renderer.failing) throw new Error("WebGL context unavailable");
    return <div role="img" aria-label="Loaded farm" />;
  },
}));

afterEach(() => {
  cleanup();
  renderer.failing = false;
});

function mountScene(selectedKey: string | null) {
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
  const onSelect = vi.fn();
  const onClear = vi.fn();
  const days = buildHarvestMonth([], new Date(2026, 9, 1));
  render(
    <AppStoreProvider store={getAppStore(host)}>
      <HarvestScene
        days={days}
        selectedKey={selectedKey}
        hoverKey={null}
        onHover={vi.fn()}
        onSelect={onSelect}
        onClear={onClear}
      />
    </AppStoreProvider>,
  );
  return { onSelect, onClear, release: () => releaseAppStore(timer) };
}

describe("harvest grid without a pointer", () => {
  it("moves the selected day with the arrow keys and clears it with Escape", () => {
    const scene = mountScene("2026-10-10");
    const grid = screen.getByRole("group", { name: "Monthly harvest calendar" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(scene.onSelect).toHaveBeenLastCalledWith("2026-10-11");
    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(scene.onSelect).toHaveBeenLastCalledWith("2026-10-09");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(scene.onSelect).toHaveBeenLastCalledWith("2026-10-17");
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(scene.onSelect).toHaveBeenLastCalledWith("2026-10-03");
    fireEvent.keyDown(grid, { key: "Escape" });
    expect(scene.onClear).toHaveBeenCalledTimes(1);
    scene.release();
  });

  it("starts at the first day and stays inside the month", () => {
    const scene = mountScene(null);
    const grid = screen.getByRole("group", { name: "Monthly harvest calendar" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(scene.onSelect).toHaveBeenLastCalledWith("2026-10-01");
    scene.release();
  });

  it("clamps at the month edges", () => {
    const scene = mountScene("2026-10-31");
    const grid = screen.getByRole("group", { name: "Monthly harvest calendar" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(scene.onSelect).toHaveBeenCalledTimes(2);
    expect(scene.onSelect).toHaveBeenNthCalledWith(1, "2026-10-31");
    expect(scene.onSelect).toHaveBeenNthCalledWith(2, "2026-10-31");
    scene.release();
  });
});

describe("harvest grid when WebGL is unavailable", () => {
  it("falls back to a readable day calendar that still selects days", () => {
    renderer.failing = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const scene = mountScene(null);
    expect(screen.getByText("Farm unavailable")).toBeTruthy();
    const calendar = screen.getByLabelText("Monthly harvest day list");
    fireEvent.click(within(calendar).getByRole("button", { name: /^2026-10-12,/ }));
    expect(scene.onSelect).toHaveBeenCalledWith("2026-10-12");
    scene.release();
  });
});
