// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act, within } from "@testing-library/react";
import { App } from "@/components/app/App";
import { TimerService } from "@/lib/timer/TimerService";
import type { Revision } from "@/lib/timer/types";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { SolanumHost } from "@/types/host";
import { DebugTools } from "@/lib/debug/DebugTools";
import { formatTime } from "@/lib/time";
import { seasonOf } from "@/lib/scene/seasons";
import { focusSession } from "./helpers/sessions";
import { updatePresets, updateSeason } from "@/state/appStore";

vi.mock("@/components/crops/CropScene", () => ({
  CropScene: ({
    progress,
    remaining,
    season,
    clockProgress,
    clockRate,
  }: {
    progress: number;
    remaining: number;
    season: string;
    clockProgress: number;
    clockRate: number;
  }) => (
    <figure
      aria-label={`Crop growth ${Math.round(progress * 100)}%`}
      data-season={season}
      data-clock={clockProgress.toFixed(3)}
      data-rate={clockRate.toFixed(5)}
    >
      <span role="timer">{formatTime(remaining)}</span>
    </figure>
  ),
}));
vi.mock("@/components/harvest/HarvestMonthScene", () => ({
  HarvestMonthScene: ({
    layout,
    season,
  }: {
    layout: { blocks: { crop: string; minutes: number }[] };
    season: string;
  }) => (
    <div
      role="img"
      aria-label="Month blocks"
      data-blocks={layout.blocks.length}
      data-crops={layout.blocks.map((block) => block.crop).join(",")}
      data-season={season}
    />
  ),
}));
vi.mock("@/components/harvest/HarvestYearScene", () => ({
  HarvestYearScene: ({
    year,
    months,
    onOpenMonth,
  }: {
    year: number;
    months: { index: number; minutes: number; date: Date }[];
    onOpenMonth: (index: number) => void;
  }) => (
    <div>
      {months.map((month) => (
        <button
          key={month.index}
          aria-label={`${month.date.toLocaleDateString(undefined, { month: "long" })} ${year}, ${Math.round(month.minutes)} focused minutes`}
          onClick={() => onOpenMonth(month.index)}
        />
      ))}
    </div>
  ),
}));
afterEach(cleanup);

async function revealControls() {
  fireEvent.click(await screen.findByRole("button", { name: "Show timer controls" }));
}

function fixture(debug = false) {
  let now = new Date(2026, 9, 31, 12).getTime();
  let sequence = 0;
  const files = new Map<string, Revision>();
  const store = {
    readAll: async () => [...files.values()].map((r) => structuredClone(r)),
    append: async (r: Revision) => {
      files.set(r.id, structuredClone(r));
    },
  };
  const env = { now: () => now, id: () => `ui-${++sequence}`, debug };
  const host: SolanumHost = {
    timer: new TimerService(store, env),
    settings: { ...DEFAULT_SETTINGS },
    saveSettings: vi.fn(async (settings) => {
      host.settings = settings;
    }),
    tags: () => ["work/client", "study"],
    notes: () => ["Project.md", "Other.md"],
    activeNote: () => "Project.md",
    openNote: vi.fn(),
    assetUrl: (name) => name,
    navigate: vi.fn(),
    unlockAudio: vi.fn(),
    previewSound: vi.fn(),
    openSettings: vi.fn(),
  };
  if (debug)
    host.debug = new DebugTools(
      host.timer,
      store,
      { enabled: true, autoFinishSeconds: 0 },
      env.now,
    );
  return {
    host,
    store,
    env,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("sidebar workflows backed by the real timer service", () => {
  it("shows an actionable empty month instead of mounting a loading farm", () => {
    const f = fixture();
    render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
    expect(screen.getByText("No harvests yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "2026-10-31" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    expect(f.host.navigate).toHaveBeenCalledWith("timer");
  });
  it("seeds demo history and finishes an active simulated crop from the debug panel", async () => {
    const f = fixture(true);
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByText("Debug tools · simulated data"));
    fireEvent.change(screen.getByLabelText("Seed month"), { target: { value: "2026-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Seed demo harvests" }));
    await waitFor(() => expect(f.host.timer.getState().sessions.length).toBeGreaterThan(10));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await revealControls();
    fireEvent.click(screen.getByText("Debug tools · simulated data"));
    fireEvent.click(screen.getByRole("button", { name: "Finish focus now" }));
    await screen.findByRole("button", { name: "Start break" });
    expect(f.host.timer.getState().sessions.find((s) => s.source === "debug")?.phase).toBe("break");
  });

  it("does not hide reconciliation controls when independent offline crops are active", async () => {
    const f = fixture();
    await f.host.timer.start({
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: [],
      notePath: null,
    });
    const original = f.host.timer.getState().sessions[0];
    await f.store.append({
      ...original,
      id: "offline-root",
      sessionId: "offline-root",
      crop: "corn",
    });
    await f.host.timer.refresh();
    render(<App host={f.host} screen="timer" />);
    expect(screen.getByLabelText("Active crop")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show timer controls" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Active crop"), { target: { value: "offline-root" } });
    fireEvent.click(screen.getByRole("button", { name: "End focus" }));
    await waitFor(() =>
      expect(
        f.host.timer.getState().sessions.find((s) => s.sessionId === "offline-root")?.status,
      ).toBe("cancelled"),
    );
    expect(
      f.host.timer.getState().sessions.find((s) => s.sessionId === original.sessionId)?.status,
    ).toBe("running");
  });

  it("persists crop choice and hides the normal interface while focusing", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const scene = screen.getByRole("figure");
    fireEvent.click(screen.getByRole("radio", { name: "Pumpkin" }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Show timer controls" });
    expect(screen.getByRole("figure")).toBe(scene);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.queryByText("Timer preferences")).toBeNull();
    expect(f.host.timer.getState().sessions[0].crop).toBe("pumpkin");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await screen.findByRole("button", { name: "Show timer controls" });
    expect(screen.queryByRole("navigation")).toBeNull();
    f.advance(25 * 60_000);
    await act(() => f.host.timer.tick());
    expect(screen.getByRole("figure")).toBe(scene);
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start break" })).toBeTruthy();
  });

  it("shows pause and stop as quiet icon-only buttons with accessible names", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await revealControls();
    for (const name of ["Pause", "End focus"]) {
      const button = screen.getByRole("button", { name });
      expect(button.textContent).toBe("");
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.getAttribute("title")).toBe(name);
      expect(button.classList.contains("mod-cta")).toBe(false);
    }
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
  });

  it("themes the crop scene by the current season, and follows a chosen season live", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    expect(screen.getByRole("figure").getAttribute("data-season")).toBe(seasonOf(new Date()));
    act(() => updateSeason(f.host.timer, "winter"));
    expect(screen.getByRole("figure").getAttribute("data-season")).toBe("winter");
    act(() => updateSeason(f.host.timer, "auto"));
    expect(screen.getByRole("figure").getAttribute("data-season")).toBe(seasonOf(new Date()));
  });

  it("offers the saved presets live and puts Start focus right under the scene", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const labels = () =>
      within(screen.getByLabelText("Focus duration"))
        .getAllByRole("button")
        .map((button) => button.textContent);
    expect(labels()).toEqual([
      "5 min",
      "10 min",
      "25 min",
      "50 min",
      "60 min",
      "90 min",
      "120 min",
    ]);
    act(() => updatePresets(f.host.timer, [15, 40], 25));
    expect(labels()).toEqual(["15 min", "40 min"]);
    expect(screen.getByRole("button", { name: "40 min" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: "15 min" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "40 min" }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await waitFor(() => expect(f.host.timer.getState().sessions[0].durationMs).toBe(40 * 60_000));
  });

  it("shows Start focus as a round icon button before the form, not as a bar below it", () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const start = screen.getByRole("button", { name: "Start focus" });
    expect(start.textContent).toBe("");
    expect(start.querySelector("svg")).not.toBeNull();
    expect(start.getAttribute("title")).toBe("Start focus");
    const presets = screen.getByLabelText("Focus duration");
    const tags = screen.getByRole("combobox", { name: "Tags" });
    expect(start.compareDocumentPosition(presets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(start.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("moves the sun with the running phase: dawn in setup, across the focus, again for the break", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const clock = () => Number(screen.getByRole("figure").getAttribute("data-clock"));
    expect(clock()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Show timer controls" });
    f.advance(10 * 60_000);
    await act(() => f.host.timer.tick());
    expect(clock()).toBeCloseTo(0.4, 2);
    f.advance(15 * 60_000);
    await act(() => f.host.timer.tick());
    // Focus is over and the break has not started: the sun is back at dawn.
    expect(clock()).toBe(0);
    fireEvent.click(await screen.findByRole("button", { name: "Start break" }));
    await waitFor(() => expect(f.host.timer.getState().sessions[0].status).toBe("running"));
    f.advance(2 * 60_000);
    await act(() => f.host.timer.tick());
    expect(clock()).toBeCloseTo(0.4, 2); // 2 of the 5 break minutes
  });

  it("keeps the sun moving only while a phase is actually running", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const rate = () => Number(screen.getByRole("figure").getAttribute("data-rate"));
    expect(rate()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Show timer controls" });
    expect(rate()).toBeCloseTo(1 / (25 * 60), 5); // across the 25 minute focus
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    expect(rate()).toBe(0);
  });

  it("returns to the immersive view from the revealed controls, by button or Escape", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await revealControls();
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enter focus view" }));
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enter focus view" })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.getByRole("button", { name: "Show timer controls" })).toBeTruthy();
  });

  describe("session details pickers", () => {
    const tagInput = () => screen.getByRole("combobox", { name: "Tags" });
    const chips = () =>
      [...document.querySelectorAll(".solanum-chip")].map((chip) => chip.textContent?.trim());
    const options = () => screen.queryAllByRole("option").map((option) => option.textContent);

    it("offers vault and past tags in a dropdown, without the # prefix", async () => {
      const f = fixture();
      render(<App host={f.host} screen="timer" />);
      fireEvent.focus(tagInput());
      expect(options()).toEqual(["study", "work/client"]);
      fireEvent.change(tagInput(), { target: { value: "#WORK" } });
      expect(options()).toEqual(["work/client"]);
    });

    it("adds a suggestion by click or arrow keys, a typed tag by Enter, and removes the last on Backspace", async () => {
      const f = fixture();
      render(<App host={f.host} screen="timer" />);
      fireEvent.focus(tagInput());
      fireEvent.mouseDown(screen.getByRole("option", { name: "study" }));
      expect(chips()).toEqual(["study"]);
      expect(options()).toEqual([]);
      fireEvent.keyDown(tagInput(), { key: "ArrowDown" });
      expect(options()).toEqual(["work/client"]);
      fireEvent.keyDown(tagInput(), { key: "Enter" });
      expect(chips()).toEqual(["study", "work/client"]);
      fireEvent.change(tagInput(), { target: { value: "#brand-new" } });
      expect(options()[0]).toBe("brand-new");
      fireEvent.keyDown(tagInput(), { key: "Enter" });
      expect(chips()).toEqual(["study", "work/client", "brand-new"]);
      fireEvent.keyDown(tagInput(), { key: "Backspace" });
      expect(chips()).toEqual(["study", "work/client"]);
      fireEvent.click(screen.getByRole("button", { name: "Remove study" }));
      expect(chips()).toEqual(["work/client"]);
    });

    it("keeps typed text as a tag when focus leaves and never duplicates tags", async () => {
      const f = fixture();
      render(<App host={f.host} screen="timer" />);
      fireEvent.change(tagInput(), { target: { value: "idea" } });
      fireEvent.blur(tagInput());
      fireEvent.change(tagInput(), { target: { value: "#idea," } });
      expect(chips()).toEqual(["idea"]);
    });

    it("starts the next crop with the previous session's tags already filled in", async () => {
      const f = fixture();
      await f.host.timer.start({
        durationMs: 5 * 60_000,
        breakMs: 5 * 60_000,
        autoBreak: false,
        tags: ["study", "deep"],
        notePath: null,
      });
      await f.host.timer.cancel(f.host.timer.getState().sessions[0].sessionId);
      render(<App host={f.host} screen="timer" />);
      expect(chips()).toEqual(["study", "deep"]);
      fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
      await waitFor(() =>
        expect(f.host.timer.getState().sessions[0].tags).toEqual(["study", "deep"]),
      );
    });

    it("searches notes by name, shows the folder, and lets the link be cleared", async () => {
      const f = fixture();
      f.host.notes = () => ["Projects/Alpha.md", "Projects/Beta.md", "Inbox.md"];
      render(<App host={f.host} screen="timer" />);
      const note = screen.getByRole("combobox", { name: "Linked note" });
      fireEvent.focus(note);
      expect(options()).toHaveLength(3);
      fireEvent.change(note, { target: { value: "alp" } });
      expect(options()).toEqual(["AlphaProjects"]);
      fireEvent.mouseDown(screen.getByRole("option", { name: /Alpha/ }));
      expect(screen.queryByRole("combobox", { name: "Linked note" })).toBeNull();
      expect(screen.getByText("Alpha")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Clear linked note" }));
      expect(screen.getByRole("combobox", { name: "Linked note" })).toBeTruthy();
    });

    it("picks a crop from a visible grid instead of a select", async () => {
      const f = fixture();
      render(<App host={f.host} screen="timer" />);
      const group = screen.getByRole("radiogroup", { name: "Crop" });
      expect(
        within(group)
          .getAllByRole("radio")
          .map((radio) => radio.getAttribute("aria-label")),
      ).toEqual(["Tomato", "Carrot", "Corn", "Pumpkin"]);
      expect(screen.getByRole("radio", { name: "Tomato" }).getAttribute("aria-checked")).toBe(
        "true",
      );
      fireEvent.click(screen.getByRole("radio", { name: "Corn" }));
      expect(screen.getByRole("radio", { name: "Corn" }).getAttribute("aria-checked")).toBe("true");
    });
  });

  it("opens native preferences from the icon menu without changing the active session", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    expect(screen.queryByRole("heading", { name: "Solanum" })).toBeNull();
    expect(screen.queryByText("A LITTLE EVERY DAY")).toBeNull();
    expect(screen.queryByText("Timer preferences")).toBeNull();
    await f.host.saveSettings({ ...f.host.settings, breakMinutes: 20, autoBreak: true });
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await revealControls();
    await screen.findByRole("button", { name: "Pause" });
    const before = structuredClone(f.host.timer.getState().sessions[0]);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Preferences" }));
    expect(f.host.openSettings).toHaveBeenCalledOnce();
    expect(f.host.timer.getState().sessions[0]).toEqual(before);
    f.advance(5 * 60_000);
    await act(() => f.host.timer.tick());
    expect(f.host.timer.getState().sessions[0]).toMatchObject({
      phase: "break",
      status: "running",
      breakMs: 20 * 60_000,
    });
    expect(screen.getByRole("timer").textContent).toBe("20:00");
  });

  it("plants tagged work, survives view teardown, restores pause, and finishes a manual break", async () => {
    const f = fixture();
    const first = render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    const tagInput = screen.getByRole("combobox", { name: "Tags" });
    fireEvent.change(tagInput, { target: { value: "#work/client" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Use active note" }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await revealControls();
    await screen.findByRole("button", { name: "Pause" });
    f.advance(2 * 60_000);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    first.unmount();
    f.advance(30 * 60_000);
    f.host.timer = new TimerService(f.store, f.env);
    await f.host.timer.refresh();
    render(<App host={f.host} screen="timer" />);
    expect(screen.getByRole("timer").textContent).toBe("03:00");
    expect(screen.getByText("work/client")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Project.md" }));
    expect(f.host.openNote).toHaveBeenCalledWith("Project.md");
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await revealControls();
    await screen.findByRole("button", { name: "Pause" });
    f.advance(3 * 60_000);
    await act(() => f.host.timer.tick());
    fireEvent.click(screen.getByRole("button", { name: "Start break" }));
    await waitFor(() => expect(f.host.timer.getState().sessions[0].status).toBe("running"));
    f.advance(5 * 60_000);
    await act(() => f.host.timer.tick());
    expect(screen.getByRole("button", { name: "Start focus" })).toBeTruthy();
    expect(f.host.timer.getState().sessions).toHaveLength(1);
  });

  async function harvestedFixture() {
    const f = fixture();
    await f.host.timer.start({
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: ["study"],
      notePath: "Project.md",
      crop: "carrot",
    });
    f.advance(5 * 60_000);
    await f.host.timer.tick();
    // A session from another year, so "work/client" exists to filter by but not in 2026.
    await f.store.append(
      focusSession("old", new Date(2025, 5, 3, 9), 25, {
        tags: ["work/client"],
        notePath: "Other.md",
      }),
    );
    await f.host.timer.refresh();
    return f;
  }

  describe("month view", () => {
    it("draws one block per harvest and summarises the month, with no days to pick", async () => {
      const f = await harvestedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      const blocks = screen.getByRole("img", { name: "Month blocks" });
      expect(blocks.getAttribute("data-blocks")).toBe("1");
      expect(blocks.getAttribute("data-crops")).toBe("carrot");
      const summary = screen.getByRole("region", { name: "Month summary" });
      expect(within(summary).getByText("5 min")).toBeTruthy();
      expect(within(summary).getByText("Harvests").nextSibling?.textContent).toBe("1");
      expect(within(summary).getByRole("list", { name: "Crops grown" }).textContent).toContain(
        "Carrot",
      );
      expect(within(summary).getByRole("list", { name: "Most used tags" }).textContent).toContain(
        "study",
      );
      expect(within(summary).getByText(/One block per harvest/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^2026-10-\d\d/ })).toBeNull();
      expect(screen.queryByRole("region", { name: "Harvest details" })).toBeNull();
    });

    it("applies the tag filter to the blocks and the numbers, and recovers with Clear filters", async () => {
      const f = await harvestedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      fireEvent.change(screen.getByLabelText("Filter by tag"), {
        target: { value: "work/client" },
      });
      expect(screen.getByText("0 min this month")).toBeTruthy();
      expect(screen.getByText("No matching harvests")).toBeTruthy();
      expect(screen.queryByRole("img", { name: "Month blocks" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(screen.getByRole("img", { name: "Month blocks" })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Next month" }));
      expect(screen.getByText("No harvests yet")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
      expect(screen.getByRole("img", { name: "Month blocks" })).toBeTruthy();
    });

    it("themes the blocks by the month's season, unless a season is chosen", async () => {
      const f = await harvestedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      expect(screen.getByRole("img", { name: "Month blocks" }).getAttribute("data-season")).toBe(
        "autumn",
      );
      act(() => updateSeason(f.host.timer, "winter"));
      expect(screen.getByRole("img", { name: "Month blocks" }).getAttribute("data-season")).toBe(
        "winter",
      );
    });

    it("offers only the tags and notes that crops have used", async () => {
      const f = await harvestedFixture();
      f.host.tags = () => ["work/client", "study", "vault-only"];
      f.host.notes = () => ["Project.md", "Other.md", "Unused.md"];
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      const optionsOf = (label: string) =>
        within(screen.getByLabelText(label))
          .getAllByRole("option")
          .map((option) => option.textContent);
      expect(optionsOf("Filter by tag")).toEqual(["All tags", "study", "work/client"]);
      expect(optionsOf("Filter by note")).toEqual(["All notes", "Other.md", "Project.md"]);
    });

    it("does not show a crop that was stopped early", async () => {
      const f = fixture();
      const id = await f.host.timer.start({
        durationMs: 25 * 60_000,
        breakMs: 5 * 60_000,
        autoBreak: false,
        tags: [],
        notePath: null,
      });
      f.advance(5 * 60_000);
      await f.host.timer.cancel(id);
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      expect(screen.getByText("No harvests yet")).toBeTruthy();
    });
  });

  describe("year overview", () => {
    const plantedFixture = harvestedFixture;
    const monthButtons = () =>
      screen.getAllByRole("button", { name: /^[A-Z][a-z]+ \d{4}, \d+ focused minutes$/ });

    it("shows every month of the year with its focused minutes, and says what a crate means", async () => {
      const f = await plantedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      expect(monthButtons()).toHaveLength(12);
      expect(screen.getByRole("heading", { name: "2026" })).toBeTruthy();
      expect(screen.getByText("5 min this year")).toBeTruthy();
      expect(screen.getByRole("button", { name: "October 2026, 5 focused minutes" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "March 2026, 0 focused minutes" })).toBeTruthy();
      expect(screen.getByText(/Each crate stands for 2 h of focus/)).toBeTruthy();
      expect(screen.getByText(/Busiest: October, 5 min/)).toBeTruthy();
    });

    it("opens a month from the year grid and returns with the Year button", async () => {
      const f = await plantedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 2, 1)} />);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      fireEvent.click(screen.getByRole("button", { name: "October 2026, 5 focused minutes" }));
      expect(screen.getByRole("heading", { name: "October 2026" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Month blocks" })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      expect(screen.getByRole("heading", { name: "2026" })).toBeTruthy();
    });

    it("moves between years and respects the tag filter", async () => {
      const f = await plantedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      fireEvent.click(screen.getByRole("button", { name: "Next year" }));
      expect(screen.getByRole("heading", { name: "2027" })).toBeTruthy();
      expect(screen.getByText("No harvests yet")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
      fireEvent.change(screen.getByLabelText("Filter by tag"), {
        target: { value: "work/client" },
      });
      expect(screen.getByText("No matching harvests")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(monthButtons()).toHaveLength(12);
    });
  });

  it("surfaces persistence errors instead of showing an unsaved planted crop", async () => {
    const f = fixture();
    f.store.append = async () => {
      throw new Error("Storage unavailable");
    };
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Storage unavailable");
    expect(f.host.timer.getState().sessions).toHaveLength(0);
  });
});
