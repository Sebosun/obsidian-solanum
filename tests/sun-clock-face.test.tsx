// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { SunClockFace } from "@/components/clock/SunClockFace";
import { useSunClock } from "@/hooks/useSunClock";
import { boardPoint } from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState } from "@/lib/scene/sunClock";

afterEach(cleanup);

const MINUTE = 60_000;

function Face({ progress, remaining = 25 * MINUTE }: { progress: number; remaining?: number }) {
  const clock = useSunClock(progress, 0, true);
  return <SunClockFace clock={clock} progress={progress} remaining={remaining} reduced />;
}

const sun = (root: HTMLElement) => root.querySelector<SVGGElement>(".solanum-clock-sun")!;
const layers = (root: HTMLElement) => [
  ...root.querySelectorAll<SVGCircleElement>(".solanum-clock-sun circle"),
];
const translation = (group: SVGGElement) => {
  const match = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/.exec(
    group.getAttribute("transform") ?? "",
  );
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
};
const scale = (group: SVGGElement) =>
  Number(/scale\(([-\d.e]+)\)/.exec(group.getAttribute("transform") ?? "")?.[1]);

describe("the sun clock in the page", () => {
  it("draws behind the scene without catching clicks or being read out", () => {
    const view = render(<Face progress={0} />);
    const sky = view.container.querySelector(".solanum-sky")!;
    expect(sky.getAttribute("aria-hidden")).toBe("true");
    expect(view.container.querySelector("svg")?.getAttribute("viewBox")).toMatch(
      /^0 0 [\d.]+ [\d.]+$/,
    );
  });

  it("traces the arc with dots", () => {
    const view = render(<Face progress={0} />);
    expect(
      view.container.querySelectorAll(".solanum-clock-arc circle:not(.solanum-clock-sun circle)")
        .length,
    ).toBe(SUN_CLOCK.arcDots + 1);
  });

  it("puts the sun where the progress says, and moves it as time passes", () => {
    const view = render(<Face progress={0} />);
    const at = () => translation(sun(view.container));
    const start = boardPoint(sunState(0).x, sunState(0).y);
    expect(at().x).toBeCloseTo(start.x, 6);
    expect(at().y).toBeCloseTo(start.y, 6);
    view.rerender(<Face progress={0.5} />);
    const top = boardPoint(0, SUN_CLOCK.arcRadiusY);
    expect(at().x).toBeCloseTo(top.x, 6);
    expect(at().y).toBeCloseTo(top.y, 6);
    view.rerender(<Face progress={1} />);
    expect(at().x).toBeCloseTo(boardPoint(SUN_CLOCK.arcRadiusX, 0).x, 6);
  });

  it("dims, shrinks and reddens the sun the closer it is to the end", () => {
    const view = render(<Face progress={0} />);
    const read = () => ({
      opacity: layers(view.container).map((layer) => Number(layer.getAttribute("fill-opacity"))),
      scale: scale(sun(view.container)),
      fill: layers(view.container)[0].getAttribute("fill"),
    });
    const early = read();
    view.rerender(<Face progress={0.95} />);
    const late = read();
    early.opacity.forEach((value, i) => expect(late.opacity[i]).toBeLessThan(value * 0.25));
    expect(late.scale).toBeLessThan(early.scale);
    expect(late.fill).not.toBe(early.fill);
    expect(early.opacity[0]).toBeCloseTo(SUN_CLOCK.sunLayers[0].opacity, 6);
    expect(early.fill).toBe(sunState(0).colorCss);
  });

  it("follows the animated sun every frame, not just on the clock's ticks", () => {
    vi.useFakeTimers();
    try {
      function Moving() {
        const clock = useSunClock(0.2, 0.01, false);
        return <SunClockFace clock={clock} progress={0.2} remaining={MINUTE} reduced={false} />;
      }
      const view = render(<Moving />);
      const xs: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        act(() => {
          vi.advanceTimersByTime(16);
        });
        xs.push(translation(sun(view.container)).x);
      }
      expect(new Set(xs).size).toBe(5);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the time in faint digits that fade a little through the phase", () => {
    const view = render(<Face progress={0} remaining={25 * MINUTE} />);
    const readout = view.container.querySelector<HTMLElement>(".solanum-clock-readout")!;
    expect([...readout.querySelectorAll(".solanum-clock-cell")]).toHaveLength(5);
    expect(readout.textContent).toBe("25:00");
    const first = Number(readout.style.getPropertyValue("--digit-opacity"));
    expect(first).toBeGreaterThan(0.2);
    expect(first).toBeLessThan(0.5);
    view.rerender(<Face progress={0.9} remaining={2 * MINUTE + 30_000} />);
    expect(readout.textContent).toBe("02:30");
    expect(Number(readout.style.getPropertyValue("--digit-opacity"))).toBeLessThan(first);
  });

  it("carries the clock's own font as a local data file, with no network use", () => {
    const view = render(<Face progress={0} />);
    const css = view.container.querySelector("style")?.textContent ?? "";
    expect(css).toContain("@font-face");
    expect(css).toContain("bricolage-grotesque-digits.woff2");
    expect(css).not.toMatch(/https?:/);
  });

  it("sizes the board from the scene, not from fixed pixels", () => {
    const view = render(<Face progress={0} />);
    const board = view.container.querySelector<HTMLElement>(".solanum-sky-board")!;
    expect(board.style.getPropertyValue("--board-aspect")).toMatch(/^\d/);
    expect(board.style.getPropertyValue("--board-lift")).toMatch(/^[\d.]+$/);
    expect(board.getAttribute("style")).not.toMatch(/\bpx\b/);
  });
});
