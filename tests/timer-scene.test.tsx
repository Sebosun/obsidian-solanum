// @vitest-environment jsdom
import { Children, isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BreakScene } from "@/components/scenes/BreakScene";
import { CropScene } from "@/components/scenes/CropScene";
import { TimerScene } from "@/components/scenes/TimerScene";
import { canvasStub, resetCanvasStub } from "./helpers/fiberStub";

vi.mock("@react-three/fiber", async () => (await import("./helpers/fiberStub")).fiberStub());

beforeEach(() => resetCanvasStub());
afterEach(cleanup);

function scene(resting: boolean, progress = 1) {
  return (
    <TimerScene
      crop="tomato"
      progress={progress}
      running={false}
      resting={resting}
      remaining={5 * 60_000}
      immersive={false}
      preview={false}
      clockProgress={0}
      clockRate={0}
      season="summer"
    />
  );
}
const drawn = () => Children.toArray(canvasStub.children).filter(isValidElement);

describe("the timer's one scene", () => {
  it("keeps the same canvas, and the time above it, when the crop gives way to the break and back", () => {
    const view = render(scene(false));
    const canvas = screen.getByTestId("canvas");
    const header = view.container.querySelector(".solanum-time-header");
    expect(header).not.toBeNull();

    view.rerender(scene(true));
    expect(screen.getByTestId("canvas")).toBe(canvas);
    expect(view.container.querySelector(".solanum-time-header")).toBe(header);

    view.rerender(scene(false));
    expect(screen.getByTestId("canvas")).toBe(canvas);
    expect(view.container.querySelector(".solanum-time-header")).toBe(header);
    expect(view.container.querySelectorAll("canvas, [data-testid=canvas]")).toHaveLength(1);
  });

  it("draws the crop inside the canvas while focusing, and the cat once the break is under way", () => {
    const view = render(scene(false));
    expect(drawn().some((element) => element.type === CropScene)).toBe(true);
    expect(drawn().some((element) => element.type === BreakScene)).toBe(false);

    view.rerender(scene(true));
    expect(drawn().some((element) => element.type === BreakScene)).toBe(true);
    expect(drawn().some((element) => element.type === CropScene)).toBe(false);
  });

  it("names itself for what it shows: the growing crop, then the break", () => {
    const view = render(scene(false));
    expect(screen.getByRole("img", { name: "Growing crop" })).toBe(screen.getByTestId("canvas"));
    expect(screen.getByRole("timer", { name: "Remaining time" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Focus progress" })).toBeTruthy();
    expect(view.container.querySelector(".solanum-time-caption")).toBeNull();

    view.rerender(scene(true));
    expect(screen.getByRole("img", { name: "A cat sleeping beside a cup of coffee" })).toBe(
      screen.getByTestId("canvas"),
    );
    expect(screen.getByRole("timer", { name: "Break time remaining" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Break progress" })).toBeTruthy();
    expect(view.container.querySelector(".solanum-time-caption")?.textContent).toBe("Break time");
  });

  it("marks a matured crop on the frame, and not the break", () => {
    const view = render(scene(false, 1));
    const root = () => view.container.firstElementChild!;
    expect(root().classList.contains("is-mature")).toBe(true);
    view.rerender(scene(false, 0.4));
    expect(root().classList.contains("is-mature")).toBe(false);
    view.rerender(scene(true, 1));
    expect(root().classList.contains("is-mature")).toBe(false);
  });
});
