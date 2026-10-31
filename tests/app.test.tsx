// @vitest-environment jsdom
import type { ReactNode } from "react";
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

vi.mock("@/components/scenes/TimerScene", () => ({
  TimerScene: ({
    progress,
    remaining,
    season,
    clockProgress,
    clockRate,
    crop,
    preview,
    resting,
    controls,
  }: {
    progress: number;
    remaining: number;
    season: string;
    clockProgress: number;
    clockRate: number;
    crop: string;
    preview?: boolean;
    resting: boolean;
    controls?: ReactNode;
  }) => (
    <figure
      data-scene={resting ? "break" : "crop"}
      data-crop={crop}
      data-preview={String(!!preview)}
      data-progress={Math.round(progress * 100)}
      data-season={season}
      data-clock={clockProgress.toFixed(3)}
      data-rate={clockRate.toFixed(5)}
    >
      <span role="timer">{formatTime(remaining)}</span>
      {controls && <div data-testid="scene-controls">{controls}</div>}
    </figure>
  ),
}));
vi.mock("@/components/scenes/HarvestMonthScene", () => ({
  HarvestMonthScene: ({
    layout,
    season,
  }: {
    layout: { blocks: { crop: string; minutes: number }[] };
    season: string;
  }) => (
    <div
      role="img"
      aria-labelledby="month-blocks-label"
      data-blocks={layout.blocks.length}
      data-crops={layout.blocks.map((block) => block.crop).join(",")}
      data-season={season}
    >
      <span id="month-blocks-label" hidden>
        Month blocks
      </span>
    </div>
  ),
}));
vi.mock("@/components/scenes/HarvestYearScene", () => ({
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

/** A session is running: the timer fills the view and its controls are in the scene. */
async function sessionRunning() {
  return screen.findByRole("button", { name: "Pause" });
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
    noteTags: () => [],
    notes: () => ["Project.md", "Other.md"],
    activeNote: () => "Project.md",
    openNote: vi.fn(),
    assetUrl: (name) => name,
    readAsset: async () => new ArrayBuffer(0),
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
  it("shows an empty month as the 3D view with nothing on it, and a way to start focusing", () => {
    const f = fixture();
    render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
    const scene = screen.getByRole("img", { name: "Month blocks" });
    expect(scene.getAttribute("data-blocks")).toBe("0");
    expect(screen.getByText("No harvests in October 2026 yet.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Month summary" })).toBeNull();
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
    await sessionRunning();
    // The full view keeps only the debug shortcut, which is enough to finish the focus.
    fireEvent.click(screen.getByRole("button", { name: "Finish focus now" }));
    await screen.findByRole("button", { name: "Start break" });
    expect(f.host.timer.getState().sessions.find((s) => s.source === "debug")?.phase).toBe("break");
  });

  it("keeps the debug shortcut within reach while a phase fills the view, so a simulated break can be finished", async () => {
    const f = fixture(true);
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    // The focus fills the view, yet force-finishing it needs no digging for the controls.
    expect(screen.queryByText("Debug tools · simulated data")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Finish focus now" }));
    await screen.findByRole("button", { name: "Start break" });
    fireEvent.click(screen.getByRole("button", { name: "Start break" }));
    await sessionRunning();
    expect(screen.queryByRole("navigation")).toBeNull(); // the break fills the view
    fireEvent.click(screen.getByRole("button", { name: "Finish break now" }));
    await waitFor(() =>
      expect(f.host.timer.getState().sessions.find((s) => s.source === "debug")?.phase).toBe(
        "done",
      ),
    );
  });

  it("does not offer the debug shortcut when debugging is off", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    expect(screen.queryByRole("button", { name: /Finish focus now/ })).toBeNull();
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
    expect(screen.getByLabelText(/Multiple active crops/)).toBeTruthy();
    // Choosing between crops needs the rest of the interface, so the view is not full.
    expect(screen.getByRole("navigation", { name: "Solanum views" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Multiple active crops/), {
      target: { value: "offline-root" },
    });
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

  it("persists crop choice and fills the view for as long as a session is under way", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const scene = screen.getByRole("figure");
    fireEvent.click(screen.getByRole("radio", { name: "Pumpkin" }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    expect(screen.getByRole("figure")).toBe(scene);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Timer preferences")).toBeNull();
    expect(f.host.timer.getState().sessions[0].crop).toBe("pumpkin");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    expect(screen.queryByRole("navigation")).toBeNull(); // paused is still full view
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await sessionRunning();
    f.advance(25 * 60_000);
    await act(() => f.host.timer.tick());
    // The focus is over and the break waits to be started: still the full view, same scene.
    expect(screen.getByRole("figure")).toBe(scene);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(within(scene).getByRole("button", { name: "Start break" })).toBeTruthy();
  });

  it("previews the finished crop while choosing, then shows it growing once started", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const scene = () => screen.getByRole("figure");
    expect(scene().getAttribute("data-preview")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Coconut" }));
    expect(scene().getAttribute("data-crop")).toBe("coconut");
    expect(scene().getAttribute("data-preview")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    expect(scene().getAttribute("data-crop")).toBe("coconut");
    expect(scene().getAttribute("data-preview")).toBe("false");
  });

  it("shows pause and stop as quiet icon-only buttons with accessible names", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    const controls = within(screen.getByTestId("scene-controls"));
    for (const name of ["Pause", "End focus"]) {
      const button = controls.getByRole("button", { name });
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
    await sessionRunning();
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

  it("gives the break a view of its own, once it is under way", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const scene = () => screen.getByRole("figure").getAttribute("data-scene");
    expect(scene()).toBe("crop"); // choosing a crop
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    expect(scene()).toBe("crop"); // growing it
    f.advance(25 * 60_000);
    await act(() => f.host.timer.tick());
    await screen.findByRole("button", { name: "Start break" });
    expect(scene()).toBe("crop"); // harvested, the break waiting to be started
    fireEvent.click(screen.getByRole("button", { name: "Start break" }));
    await waitFor(() => expect(scene()).toBe("break")); // resting
    expect(screen.queryByRole("navigation")).toBeNull(); // and full screen, like the focus
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    expect(scene()).toBe("break"); // a paused break is still the break
    fireEvent.click(screen.getByRole("button", { name: "Skip break" }));
    await waitFor(() => expect(scene()).toBe("crop")); // over: back to choosing a crop
  });

  it("keeps the sun moving only while a phase is actually running", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    const rate = () => Number(screen.getByRole("figure").getAttribute("data-rate"));
    expect(rate()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    expect(rate()).toBeCloseTo(1 / (25 * 60), 5); // across the 25 minute focus
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await screen.findByRole("button", { name: "Resume" });
    expect(rate()).toBe(0);
  });

  it("keeps pause and stop in the scene, with no way to reveal or hide them", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    expect(screen.queryByTestId("scene-controls")).toBeNull(); // choosing a crop: nothing to pause
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    const inScene = () => within(screen.getByTestId("scene-controls"));
    expect(inScene().getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(inScene().getByRole("button", { name: "End focus" })).toBeTruthy();
    // There is no corner button, no toolbar button and no Escape toggle any more.
    expect(screen.queryByRole("button", { name: "Show timer controls" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enter focus view" })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(inScene().getByRole("button", { name: "Pause" })).toBeTruthy();
    fireEvent.click(inScene().getByRole("button", { name: "End focus" }));
    // Ending the session returns to choosing a crop, with the rest of the interface.
    await screen.findByRole("button", { name: "Start focus" });
    expect(screen.getByRole("navigation", { name: "Solanum views" })).toBeTruthy();
    expect(screen.queryByTestId("scene-controls")).toBeNull();
  });

  it("brings the interface back for a failure, while the controls stay in the scene", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    vi.spyOn(f.host.timer, "pause").mockRejectedValueOnce(new Error("Disk is full"));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(await screen.findByText("Disk is full")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Solanum views" })).toBeTruthy();
    expect(
      within(screen.getByTestId("scene-controls")).getByRole("button", { name: "Pause" }),
    ).toBeTruthy();
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

    it("offers every tag in the vault, not just the first few", async () => {
      const f = fixture();
      const all = Array.from({ length: 40 }, (_, i) => `topic-${String(i).padStart(2, "0")}`);
      f.host.tags = () => all;
      render(<App host={f.host} screen="timer" />);
      fireEvent.focus(tagInput());
      expect(options()).toEqual(all);
      fireEvent.change(tagInput(), { target: { value: "topic-3" } });
      expect(options()).toEqual(all.filter((tag) => tag.includes("topic-3")));
    });

    describe("from the active note", () => {
      const addFromNote = () => screen.queryByRole("button", { name: "Add active note's tags" });

      it("adds all the active note's tags with one button, then has nothing left to offer", async () => {
        const f = fixture();
        f.host.noteTags = (path) => (path === "Project.md" ? ["work/client", "focus"] : []);
        render(<App host={f.host} screen="timer" />);
        fireEvent.click(addFromNote()!);
        expect(chips()).toEqual(["work/client", "focus"]);
        expect(addFromNote()).toBeNull();
      });

      it("keeps the tags already chosen and offers only the ones still missing", async () => {
        const f = fixture();
        f.host.noteTags = () => ["work/client", "focus"];
        render(<App host={f.host} screen="timer" />);
        fireEvent.focus(tagInput());
        fireEvent.mouseDown(screen.getByRole("option", { name: "study" }));
        fireEvent.click(addFromNote()!);
        expect(chips()).toEqual(["study", "work/client", "focus"]);
      });

      it("is not offered when the note has no tags, or there is no active note", async () => {
        const none = fixture();
        none.host.noteTags = () => [];
        const first = render(<App host={none.host} screen="timer" />);
        expect(addFromNote()).toBeNull();
        first.unmount();
        const nothing = fixture();
        nothing.host.activeNote = () => null;
        nothing.host.noteTags = () => ["work"];
        render(<App host={nothing.host} screen="timer" />);
        expect(addFromNote()).toBeNull();
      });

      it("shows tags that are new to the vault as chips, without the #", async () => {
        const f = fixture();
        f.host.noteTags = () => ["fresh-idea"];
        render(<App host={f.host} screen="timer" />);
        fireEvent.click(addFromNote()!);
        expect(chips()).toEqual(["fresh-idea"]);
      });
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
      expect(within(group).getAllByRole("radio")).toHaveLength(6);
      for (const name of ["Tomato", "Carrot", "Corn", "Pumpkin", "Coconut", "Apple"])
        expect(within(group).getByRole("radio", { name })).toBeTruthy();
      expect(screen.getByRole("radio", { name: "Tomato" }).getAttribute("aria-checked")).toBe(
        "true",
      );
      fireEvent.click(screen.getByRole("radio", { name: "Corn" }));
      expect(screen.getByRole("radio", { name: "Corn" }).getAttribute("aria-checked")).toBe("true");
      fireEvent.click(screen.getByRole("radio", { name: "Apple" }));
      expect(screen.getByRole("radio", { name: "Apple" }).getAttribute("aria-checked")).toBe(
        "true",
      );
    });
  });

  it("opens native preferences from the icon menu, and settings changed meanwhile shape the break", async () => {
    const f = fixture();
    render(<App host={f.host} screen="timer" />);
    expect(screen.queryByRole("heading", { name: "Solanum" })).toBeNull();
    expect(screen.queryByText("A LITTLE EVERY DAY")).toBeNull();
    expect(screen.queryByText("Timer preferences")).toBeNull();
    await f.host.saveSettings({ ...f.host.settings, breakMinutes: 20, autoBreak: true });
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Preferences" }));
    expect(f.host.openSettings).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await sessionRunning();
    // While a session is under way the view is full: there is no menu to open.
    expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull();
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
    await sessionRunning();
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
    expect(f.host.timer.getState().sessions[0]).toMatchObject({
      tags: ["work/client"],
      notePath: "Project.md",
    });
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await sessionRunning();
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
      expect(screen.getByText(/No matching harvests this month/)).toBeTruthy();
      // The 3D view stays, with nothing on it, rather than giving way to a message.
      expect(screen.getByRole("img", { name: "Month blocks" }).getAttribute("data-blocks")).toBe(
        "0",
      );
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(
        Number(screen.getByRole("img", { name: "Month blocks" }).getAttribute("data-blocks")),
      ).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: "Next month" }));
      expect(screen.getByText("No harvests in November 2026 yet.")).toBeTruthy();
      expect(screen.getByRole("img", { name: "Month blocks" }).getAttribute("data-blocks")).toBe(
        "0",
      );
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
      expect(screen.getByText("No harvests in October 2026 yet.")).toBeTruthy();
      expect(screen.getByRole("img", { name: "Month blocks" })).toBeTruthy();
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

    it("moves between years and keeps showing empty crates when there is nothing to show", async () => {
      const f = await plantedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      fireEvent.click(screen.getByRole("button", { name: "Next year" }));
      expect(screen.getByRole("heading", { name: "2027" })).toBeTruthy();
      expect(monthButtons()).toHaveLength(12);
      expect(screen.getByText("No harvests in 2027 yet.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
      expect(screen.getByText(/Each crate stands for/)).toBeTruthy();
    });

    it("offers a way back to the current year or month from any other one", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 15, 12));
      try {
        const f = await plantedFixture();
        render(<App host={f.host} screen="harvest" />);
        const back = () => screen.queryByRole("button", { name: /Back to this/ });
        expect(back()).toBeNull(); // already on the current month
        fireEvent.click(screen.getByRole("button", { name: "Next month" }));
        fireEvent.click(screen.getByRole("button", { name: "Next month" }));
        expect(screen.getByText("No harvests in December 2026 yet.")).toBeTruthy();
        fireEvent.click(back()!);
        expect(screen.getByRole("heading", { name: /October 2026/ })).toBeTruthy();
        expect(back()).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Year" }));
        expect(back()).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
        fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
        expect(screen.getByRole("heading", { name: "2024" })).toBeTruthy();
        expect(monthButtons()).toHaveLength(12);
        fireEvent.click(back()!);
        expect(screen.getByRole("heading", { name: "2026" })).toBeTruthy();
        expect(back()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("applies the tag filter to the year, with a way back when it matches nothing", async () => {
      const f = await plantedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      fireEvent.change(screen.getByLabelText("Filter by tag"), {
        target: { value: "work/client" },
      });
      expect(monthButtons()).toHaveLength(12);
      expect(screen.getByText(/No matching harvests this year/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(screen.getByText(/Each crate stands for/)).toBeTruthy();
      expect(screen.getByText(/Busiest: October/)).toBeTruthy();
    });
  });

  describe("hover tooltips", () => {
    // Obsidian shows every aria-label (and title) as a tooltip when hovering the element or what is inside it.
    const CONTROLS = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"]);
    const tooltips = (root: HTMLElement) =>
      [...root.querySelectorAll("[aria-label], [title]")]
        .filter((element) => !CONTROLS.has(element.tagName))
        .map(
          (element) =>
            `${element.tagName.toLowerCase()}: ${element.getAttribute("aria-label") ?? element.getAttribute("title")}`,
        );

    it("does not label scenes, groups or regions on the timer in a way that pops up", async () => {
      const f = await harvestedFixture();
      const view = render(<App host={f.host} screen="timer" />);
      expect(screen.getByRole("button", { name: "Start break" })).toBeTruthy();
      expect(tooltips(view.container)).toEqual([]);
    });

    it("does not label the harvest views in a way that pops up", async () => {
      const f = await harvestedFixture();
      const view = render(
        <App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />,
      );
      expect(await screen.findByRole("region", { name: "Month summary" })).toBeTruthy();
      expect(tooltips(view.container)).toEqual([]);
      fireEvent.click(screen.getByRole("button", { name: "Year" }));
      expect(tooltips(view.container)).toEqual([]);
    });

    it("still names the scenes for assistive technology", async () => {
      const f = await harvestedFixture();
      render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
      expect(await screen.findByRole("region", { name: "Month summary" })).toBeTruthy();
      expect(screen.getByRole("group", { name: "Harvest range" })).toBeTruthy();
      expect(screen.getByRole("navigation", { name: "Solanum views" })).toBeTruthy();
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
