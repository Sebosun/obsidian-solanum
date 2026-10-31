// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act, within } from "@testing-library/react";
import { App } from "../src/components/app/App";
import { TimerService } from "../src/lib/timer/TimerService";
import type { Revision } from "../src/lib/timer/types";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import type { SolanumHost } from "../src/types/host";
import { DebugTools } from "../src/lib/debug/DebugTools";
import { formatTime } from "../src/lib/time";

vi.mock("../src/components/crops/CropScene", () => ({
  CropScene: ({ progress, remaining }: { progress: number; remaining: number }) => (
    <figure aria-label={`Crop growth ${Math.round(progress * 100)}%`}>
      <span role="timer">{formatTime(remaining)}</span>
    </figure>
  ),
}));
vi.mock("../src/components/harvest/HarvestScene", () => ({
  HarvestScene: ({
    days,
    onHover,
    onSelect,
  }: {
    days: { key: string }[];
    onHover: (key: string | null) => void;
    onSelect: (key: string) => void;
  }) => (
    <div>
      {days.map((day) => (
        <button
          key={day.key}
          aria-label={day.key}
          onPointerEnter={() => onHover(day.key)}
          onPointerLeave={() => onHover(null)}
          onClick={() => onSelect(day.key)}
        >
          {day.key}
        </button>
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
    fireEvent.change(screen.getByLabelText("Crop"), { target: { value: "pumpkin" } });
    fireEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Show timer controls" });
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
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start break" })).toBeTruthy();
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
    fireEvent.click(screen.getByText("Details"));
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "#work/client" } });
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
    expect(screen.getByText("#work/client")).toBeTruthy();
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

  it("shows real harvest details and applies tag filters", async () => {
    const f = fixture();
    await f.host.timer.start({
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: ["study"],
      notePath: "Project.md",
    });
    f.advance(5 * 60_000);
    await f.host.timer.tick();
    render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "2026-10-31" }));
    expect(screen.getByRole("button", { name: "Project.md" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter by tag"), { target: { value: "work/client" } });
    expect(screen.queryByRole("button", { name: "Project.md" })).toBeNull();
    expect(screen.getByText("0 min this month")).toBeTruthy();
    expect(screen.getByText("No matching harvests")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "2026-10-31" })).toBeTruthy();
  });

  it("previews crop details on hover and pins them on click", async () => {
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
    render(<App host={f.host} screen="harvest" initialMonth={new Date(2026, 9, 1)} />);
    const day = screen.getByRole("button", { name: "2026-10-31" });
    fireEvent.pointerEnter(day);
    expect(screen.getByText(/Carrot/)).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Harvest details" })).getByText("#study"),
    ).toBeTruthy();
    fireEvent.click(day);
    fireEvent.pointerLeave(day);
    fireEvent.click(screen.getByRole("button", { name: "Project.md" }));
    expect(f.host.openNote).toHaveBeenCalledWith("Project.md");
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
