// @vitest-environment jsdom
import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SceneFrame, type SceneFrameState } from "@/components/stage/SceneFrame";
import { sunState } from "@/lib/scene/sunClock";
import { canvasStub, resetCanvasStub } from "./helpers/fiberStub";

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => motion.reduced }));

vi.mock("@react-three/fiber", async () => (await import("./helpers/fiberStub")).fiberStub());

beforeEach(() => {
  motion.reduced = false;
  resetCanvasStub();
});
afterEach(cleanup);

interface Overrides {
  remaining?: number;
  clockProgress?: number;
  clockRate?: number;
  season?: "winter" | "spring" | "summer" | "autumn";
  immersive?: boolean;
  classNames?: string[];
  caption?: string;
  camera?: { center?: number };
  resetKey?: unknown;
  children?: (state: SceneFrameState) => ReactNode;
}
function frame(over: Overrides = {}) {
  return (
    <SceneFrame
      remaining={over.remaining ?? 4 * 60_000 + 56_000}
      clockProgress={over.clockProgress ?? 0.25}
      clockRate={over.clockRate ?? 0}
      season={over.season ?? "summer"}
      immersive={over.immersive}
      classNames={over.classNames}
      caption={over.caption}
      camera={over.camera}
      resetKey={over.resetKey}
      label="What the view shows"
      timerLabel="Time left"
      progressLabel="How far along"
      fallback={<p>Fallback</p>}
    >
      {over.children ?? (() => null)}
    </SceneFrame>
  );
}

describe("the frame every timer scene shares", () => {
  it("puts the time at the top, a progress bar along the bottom, and no sun or ring", () => {
    const { container } = render(frame({ caption: "Break time" }));
    const header = container.querySelector(".solanum-time-header")!;
    expect(header.querySelector(".solanum-clock-readout")?.textContent).toBe("04:56");
    expect(header.querySelector(".solanum-time-caption")?.textContent).toBe("Break time");
    expect(
      screen.getByRole("progressbar", { name: "How far along" }).getAttribute("aria-valuenow"),
    ).toBe("25");
    expect(
      container.querySelector(".solanum-sky, .solanum-clock-arc, .solanum-clock-sun"),
    ).toBeNull();
  });

  it("names the 3D view and the timer for assistive technology, without hover tooltips", () => {
    const { container } = render(frame());
    expect(screen.getByRole("img", { name: "What the view shows" })).toBeTruthy();
    expect(screen.getByRole("timer", { name: "Time left" }).textContent).toBe("04:56");
    expect(container.querySelectorAll("[aria-label], [title]")).toHaveLength(0);
  });

  it("is a scene of the season, plus whatever else the scene asks for, filling the view when immersive", () => {
    const { container } = render(
      frame({ season: "autumn", classNames: ["is-mature"], immersive: true }),
    );
    const root = container.firstElementChild!;
    expect(root.classList.contains("solanum-scene")).toBe(true);
    expect(root.classList.contains("is-autumn")).toBe(true);
    expect(root.classList.contains("is-mature")).toBe(true);
    expect(root.classList.contains("is-immersive")).toBe(true);
  });

  it("is not immersive unless asked", () => {
    const { container } = render(frame());
    expect(container.firstElementChild!.classList.contains("is-immersive")).toBe(false);
  });

  it("darkens the sky as the phase wears on, and tints it with the season", () => {
    const { container, rerender } = render(frame({ clockProgress: 0 }));
    const root = () => container.firstElementChild as HTMLElement;
    expect(Number(root().style.getPropertyValue("--dusk"))).toBeCloseTo(sunState(0).dusk, 6);
    expect(root().style.getPropertyValue("--season-glow")).not.toBe("");
    rerender(frame({ clockProgress: 0.9 }));
    expect(Number(root().style.getPropertyValue("--dusk"))).toBeCloseTo(sunState(0.9).dusk, 6);
  });

  it("hands the scene what it needs to draw: motion, visibility, the sun and its clock", () => {
    const seen: SceneFrameState[] = [];
    render(
      frame({
        clockProgress: 0.5,
        children: (state) => {
          seen.push(state);
          return null;
        },
      }),
    );
    expect(seen.length).toBeGreaterThan(0);
    const state = seen[seen.length - 1];
    expect(state.reduced).toBe(false);
    expect(state.visible).toBe(true);
    expect(state.animate).toBe(true);
    expect(state.sun.progress).toBeCloseTo(0.5, 6);
    expect(state.clock.sun.current.progress).toBeCloseTo(0.5, 6);
  });

  it("renders its canvas continuously while animating, and only on demand under reduced motion", () => {
    render(frame());
    expect(canvasStub.props?.frameloop).toBe("always");
    cleanup();
    motion.reduced = true;
    render(frame());
    expect(canvasStub.props?.frameloop).toBe("demand");
  });

  it("sets up the camera for the scene: its own bounds and centre when it has them", () => {
    render(frame({ camera: { center: 0.46 } }));
    const elements = Children.toArray(canvasStub.children).filter(isValidElement);
    const camera = elements.find(
      (element) => (element.props as { center?: number }).center === 0.46,
    );
    expect(camera).toBeDefined();
  });

  it("falls back to what it was given when the canvas cannot be made", () => {
    canvasStub.mode = "failing";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(frame());
    error.mockRestore();
    expect(screen.getByText("Fallback")).toBeTruthy();
    // The time and the bar still show, so a broken scene never costs the timer.
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toBe("04:56");
  });
});
