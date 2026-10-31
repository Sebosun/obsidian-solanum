// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/clock/ProgressBar";
import { useSunClock } from "@/hooks/useSunClock";
import { sunState } from "@/lib/scene/sunClock";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Bar({
  progress,
  rate = 0,
  reduced = true,
}: {
  progress: number;
  rate?: number;
  reduced?: boolean;
}) {
  const clock = useSunClock(progress, rate, reduced);
  return <ProgressBar clock={clock} progress={progress} label="Break progress" />;
}
const fill = (root: HTMLElement) => root.querySelector<HTMLElement>(".solanum-progress-fill")!;
const scale = (element: HTMLElement) =>
  Number(/scaleX\(([\d.e-]+)\)/.exec(element.style.transform)?.[1]);

describe("the progress bar", () => {
  it("is a named progress bar that says how far along it is", () => {
    render(<Bar progress={0.4} />);
    const bar = screen.getByRole("progressbar", { name: "Break progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("fills from the left as far as the progress says", () => {
    const view = render(<Bar progress={0.25} />);
    expect(scale(fill(view.container))).toBeCloseTo(0.25, 6);
    view.rerender(<Bar progress={0.8} />);
    expect(scale(fill(view.container))).toBeCloseTo(0.8, 6);
  });

  it("starts empty and ends full", () => {
    const view = render(<Bar progress={0} />);
    expect(scale(fill(view.container))).toBe(0);
    view.rerender(<Bar progress={1} />);
    expect(scale(fill(view.container))).toBe(1);
  });

  it("grows a little every frame between the clock's ticks, instead of stepping", () => {
    const view = render(<Bar progress={0.2} rate={0.01} reduced={false} />);
    const seen: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
      seen.push(scale(fill(view.container)));
    }
    expect(new Set(seen).size).toBe(6);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("takes the colour of the sun, so it warms as the break wears on", () => {
    const view = render(<Bar progress={0} />);
    const early = fill(view.container).style.backgroundColor;
    view.rerender(<Bar progress={1} />);
    const late = fill(view.container).style.backgroundColor;
    expect(early).not.toBe("");
    expect(late).not.toBe(early);
    expect(sunState(0).colorCss).not.toBe(sunState(1).colorCss);
  });

  it("stays in the page, with no pixel sizes of its own", () => {
    const view = render(<Bar progress={0.5} />);
    expect(view.container.innerHTML).not.toMatch(/\d\s*px/);
  });
});
