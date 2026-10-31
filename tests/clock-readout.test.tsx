// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { ClockReadout } from "@/components/clock/ClockReadout";
import { CLOCK_DIGITS } from "@/lib/scene/constants";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const cells = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".solanum-clock-cell")];
const incoming = (cell: HTMLElement) => cell.querySelector(".solanum-clock-glyph:not(.is-out)");
const outgoing = (cell: HTMLElement) => cell.querySelector(".solanum-clock-glyph.is-out");
const rollMs = CLOCK_DIGITS.roll.seconds * 1000;
const text = (el: Element | null) => el?.textContent ?? null;

describe("the countdown digits", () => {
  it("shows one cell per character, each as wide as its kind, however the time reads", () => {
    const view = render(<ClockReadout text="11:11" reduced={false} />);
    const widths = cells(view.container).map((cell) => cell.style.width);
    expect(widths).toEqual(["0.66em", "0.66em", "0.3em", "0.66em", "0.66em"]);
    view.rerender(<ClockReadout text="00:08" reduced={false} />);
    expect(cells(view.container).map((cell) => cell.style.width)).toEqual(widths);
  });

  it("is hidden from assistive technology, since the page has its own timer", () => {
    const view = render(<ClockReadout text="25:00" reduced={false} />);
    expect(view.container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("rolls only the digit that changed: the old one out, the new one in", () => {
    const view = render(<ClockReadout text="18:23" reduced={false} />);
    view.rerender(<ClockReadout text="18:22" reduced={false} />);
    const all = cells(view.container);
    expect(all.filter((cell) => outgoing(cell))).toHaveLength(1);
    expect(text(outgoing(all[4]))).toBe("3");
    expect(text(incoming(all[4]))).toBe("2");
    expect(incoming(all[4])?.classList.contains("is-in")).toBe(true);
    for (const cell of all.slice(0, 4))
      expect(incoming(cell)?.classList.contains("is-in")).toBe(false);
  });

  it("clears the rolled digit once the roll is over", () => {
    const view = render(<ClockReadout text="18:23" reduced={false} />);
    view.rerender(<ClockReadout text="18:22" reduced={false} />);
    act(() => {
      vi.advanceTimersByTime(rollMs - 10);
    });
    expect(outgoing(cells(view.container)[4])).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(20);
    });
    const last = cells(view.container)[4];
    expect(outgoing(last)).toBeNull();
    expect(text(incoming(last))).toBe("2");
    expect(incoming(last)?.classList.contains("is-in")).toBe(false);
  });

  it("rolls every digit when the whole time changes, such as a new phase", () => {
    const view = render(<ClockReadout text="00:01" reduced={false} />);
    view.rerender(<ClockReadout text="59:30" reduced={false} />);
    expect(cells(view.container).filter((cell) => outgoing(cell))).toHaveLength(4);
  });

  it("keeps rolling to the latest digit when it changes again mid-roll", () => {
    const view = render(<ClockReadout text="18:25" reduced={false} />);
    view.rerender(<ClockReadout text="18:24" reduced={false} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    view.rerender(<ClockReadout text="18:23" reduced={false} />);
    const last = cells(view.container)[4];
    expect(text(incoming(last))).toBe("3");
    expect(text(outgoing(last))).toBe("4");
    act(() => {
      vi.advanceTimersByTime(rollMs + 10);
    });
    expect(outgoing(cells(view.container)[4])).toBeNull();
  });

  it("changes instantly under reduced motion", () => {
    const view = render(<ClockReadout text="18:23" reduced />);
    view.rerender(<ClockReadout text="18:22" reduced />);
    const last = cells(view.container)[4];
    expect(outgoing(last)).toBeNull();
    expect(text(incoming(last))).toBe("2");
    expect(incoming(last)?.classList.contains("is-in")).toBe(false);
  });

  it("copes with a time of a different length", () => {
    const view = render(<ClockReadout text="9:59" reduced={false} />);
    view.rerender(<ClockReadout text="10:00" reduced={false} />);
    expect(cells(view.container)).toHaveLength(5);
    act(() => {
      vi.advanceTimersByTime(rollMs + 10);
    });
    expect(view.container.querySelectorAll(".is-out")).toHaveLength(0);
    expect(
      cells(view.container)
        .map((cell) => text(incoming(cell)))
        .join(""),
    ).toBe("10:00");
  });
});
