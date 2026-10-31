// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestPanel } from "@/components/harvest/HarvestPanel";
import { AppStoreProvider } from "@/components/app/AppStoreProvider";
import { getAppStore, releaseAppStore } from "@/state/appStore";
import { TimerService } from "@/lib/timer/TimerService";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import * as month from "@/lib/harvest/month";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";
import type { SolanumHost } from "@/types/host";

// The 3D views have their own tests; here they only show what they were given.
vi.mock("@/components/scenes/HarvestMonthScene", () => ({
  HarvestMonthScene: ({ layout }: { layout: { blocks: unknown[] } }) => (
    <div data-testid="month-scene" data-blocks={layout.blocks.length} />
  ),
}));
vi.mock("@/components/scenes/HarvestYearScene", () => ({
  HarvestYearScene: () => <div data-testid="year-scene" />,
}));
// Spies that still do the real work, to see what the panel asks for.
vi.mock("@/lib/harvest/month", async (original) => {
  const actual = await original<typeof import("@/lib/harvest/month")>();
  return {
    ...actual,
    layoutHarvestBlocks: vi.fn(actual.layoutHarvestBlocks),
    summarizeMonth: vi.fn(actual.summarizeMonth),
  };
});

const MONTHS_IN_YEAR = 12;
const OCTOBER = new Date(2026, 9, 1);

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

async function mount(sessions: Revision[]) {
  const timer = new TimerService(
    { readAll: async () => sessions, append: async () => {} },
    { now: () => new Date(2026, 9, 31, 12).getTime(), id: () => "unused" },
  );
  await timer.refresh();
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
  render(
    <AppStoreProvider store={getAppStore(host)}>
      <HarvestPanel initialMonth={OCTOBER} />
    </AppStoreProvider>,
  );
  return () => releaseAppStore(timer);
}

describe("an empty month", () => {
  it("is the same month for the scene, the caption and the minutes when sessions focused for no time", async () => {
    const release = await mount([focusSession("instant", new Date(2026, 9, 3, 9), 0)]);
    expect(screen.getByTestId("month-scene").getAttribute("data-blocks")).toBe("0");
    expect(screen.getByText("No harvests in October 2026 yet.")).toBeTruthy();
    expect(screen.getByText("0 min this month")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Month summary" })).toBeNull();
    release();
  });

  it("gives way to the summary once there is a harvest", async () => {
    const release = await mount([focusSession("done", new Date(2026, 9, 3, 9), 25)]);
    expect(screen.getByTestId("month-scene").getAttribute("data-blocks")).toBe("1");
    expect(screen.getByRole("region", { name: "Month summary" })).toBeTruthy();
    expect(screen.getByText("25 min this month")).toBeTruthy();
    expect(screen.queryByText(/No harvests in/)).toBeNull();
    release();
  });
});

describe("working out only the view on show", () => {
  const sessions = [
    focusSession("a", new Date(2026, 9, 3, 9), 25, { tags: ["study"] }),
    focusSession("b", new Date(2026, 2, 3, 9), 40, { tags: ["work"] }),
  ];

  it("lays out the month's blocks and summarises that month alone in the month view", async () => {
    const release = await mount(sessions);
    expect(month.layoutHarvestBlocks).toHaveBeenCalledTimes(1);
    expect(month.summarizeMonth).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("year-scene")).toBeNull();
    release();
  });

  it("summarises the twelve months and nothing more in the year view, even as the filter changes", async () => {
    const release = await mount(sessions);
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(screen.getByTestId("year-scene")).toBeTruthy();
    expect(screen.queryByTestId("month-scene")).toBeNull();
    vi.mocked(month.layoutHarvestBlocks).mockClear();
    vi.mocked(month.summarizeMonth).mockClear();
    fireEvent.change(screen.getByLabelText("Filter by tag"), { target: { value: "study" } });
    expect(month.summarizeMonth).toHaveBeenCalledTimes(MONTHS_IN_YEAR);
    expect(month.layoutHarvestBlocks).not.toHaveBeenCalled();
    expect(screen.getByText("25 min this year")).toBeTruthy();
    release();
  });

  it("goes back to the month's own numbers when returning to the month view", async () => {
    const release = await mount(sessions);
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByText("25 min this month")).toBeTruthy();
    expect(screen.getByTestId("month-scene").getAttribute("data-blocks")).toBe("1");
    release();
  });
});
