// @vitest-environment jsdom
import { readFileSync } from "node:fs";
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
const flipOf = (cell: HTMLElement) => cell.querySelector<HTMLElement>(".solanum-flip");
const half = (cell: HTMLElement, selector: string) =>
  cell.querySelector(`.solanum-flip-half${selector}`);
const text = (element: Element | null) => element?.textContent ?? null;
const flipMs = CLOCK_DIGITS.flip.seconds * 1000;
const time = (value: string, reduced = false) => <ClockReadout text={value} reduced={reduced} />;

describe("the countdown digits", () => {
  it("shows one cell per character, each as wide as its kind, however the time reads", () => {
    const view = render(time("11:11"));
    const widths = cells(view.container).map((cell) => cell.style.width);
    expect(widths).toEqual(["0.66em", "0.66em", "0.3em", "0.66em", "0.66em"]);
    view.rerender(time("00:08"));
    expect(cells(view.container).map((cell) => cell.style.width)).toEqual(widths);
  });

  it("is hidden from assistive technology, since the page has its own timer", () => {
    const view = render(time("25:00"));
    expect(view.container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is plain text while nothing changes", () => {
    const view = render(time("25:00"));
    expect(view.container.textContent).toBe("25:00");
    expect(view.container.querySelector(".solanum-flip")).toBeNull();
  });
});

describe("the digits flipping like a flip clock", () => {
  it("flips only the digit that changed: the old top folds down onto the new one, the new bottom drops into place", () => {
    const view = render(time("18:23"));
    view.rerender(time("18:22"));
    const all = cells(view.container);
    expect(all.filter((cell) => flipOf(cell))).toHaveLength(1);
    const last = all[4];
    // Behind: the new digit's top half, and the old digit's bottom half still showing.
    expect(text(half(last, ".is-top.is-static"))).toBe("2");
    expect(text(half(last, ".is-bottom.is-static"))).toBe("3");
    // In front: the old top half about to fold away, the new bottom half about to unfold.
    expect(text(half(last, ".is-top.is-leaf"))).toBe("3");
    expect(text(half(last, ".is-bottom.is-leaf"))).toBe("2");
    for (const cell of all.slice(0, 4)) expect(flipOf(cell)).toBeNull();
  });

  it("is only the two halves of each digit, each half drawn once", () => {
    const view = render(time("18:23"));
    view.rerender(time("18:22"));
    const flip = flipOf(cells(view.container)[4])!;
    expect(flip.querySelectorAll(".solanum-flip-half")).toHaveLength(4);
    expect(flip.querySelectorAll(".is-top")).toHaveLength(2);
    expect(flip.querySelectorAll(".is-bottom")).toHaveLength(2);
    expect(flip.querySelectorAll(".is-leaf")).toHaveLength(2);
  });

  it("settles into the new digit, as plain text, when the flip is over", () => {
    const view = render(time("18:23"));
    view.rerender(time("18:22"));
    act(() => {
      vi.advanceTimersByTime(flipMs - 10);
    });
    expect(flipOf(cells(view.container)[4])).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(flipOf(cells(view.container)[4])).toBeNull();
    expect(view.container.textContent).toBe("18:22");
  });

  it("flips every digit when the whole time changes, such as a new phase", () => {
    const view = render(time("00:01"));
    view.rerender(time("59:30"));
    expect(cells(view.container).filter((cell) => flipOf(cell))).toHaveLength(4);
    act(() => {
      vi.advanceTimersByTime(flipMs + 10);
    });
    expect(view.container.textContent).toBe("59:30");
  });

  it("carries on from what is showing when the digit changes again mid-flip", () => {
    const view = render(time("18:25"));
    view.rerender(time("18:24"));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    view.rerender(time("18:23"));
    const last = cells(view.container)[4];
    expect(text(half(last, ".is-top.is-static"))).toBe("3");
    expect(text(half(last, ".is-top.is-leaf"))).toBe("4");
    act(() => {
      vi.advanceTimersByTime(flipMs + 10);
    });
    expect(view.container.textContent).toBe("18:23");
  });

  it("changes instantly under reduced motion", () => {
    const view = render(time("18:23", true));
    view.rerender(time("18:22", true));
    expect(view.container.querySelector(".solanum-flip")).toBeNull();
    expect(view.container.textContent).toBe("18:22");
  });

  it("copes with a time of a different length", () => {
    const view = render(time("9:59"));
    view.rerender(time("10:00"));
    expect(cells(view.container)).toHaveLength(5);
    act(() => {
      vi.advanceTimersByTime(flipMs + 10);
    });
    expect(view.container.querySelector(".solanum-flip")).toBeNull();
    expect(view.container.textContent).toBe("10:00");
  });
});

describe("the flip's styling", () => {
  const css = readFileSync("src/styles.css", "utf8");

  it("folds the top half down first and drops the bottom half in once it has gone", () => {
    expect(css).toMatch(
      /@keyframes solanum-flip-top\s*\{\s*from\s*\{[^}]*rotateX\(0deg\)[^}]*\}\s*to\s*\{[^}]*rotateX\(-90deg\)/s,
    );
    expect(css).toMatch(
      /@keyframes solanum-flip-bottom\s*\{\s*from\s*\{[^}]*rotateX\(90deg\)[^}]*\}\s*to\s*\{[^}]*rotateX\(0deg\)/s,
    );
    const top = /\.solanum-flip-half\.is-leaf\.is-top\s*\{([^}]*)\}/s.exec(css)?.[1] ?? "";
    const bottom = /\.solanum-flip-half\.is-leaf\.is-bottom\s*\{([^}]*)\}/s.exec(css)?.[1] ?? "";
    expect(top).toMatch(/animation:\s*solanum-flip-top/);
    // The second half waits for the first half's duration before it starts.
    expect(bottom).toMatch(
      /animation:\s*solanum-flip-bottom[^;]*calc\(var\(--flip-seconds\) \/ 2\)/,
    );
  });

  it("shows only half of each glyph in a half, and hides the back of a folded half", () => {
    expect(css).toMatch(/\.solanum-flip-half\.is-top\s*\{[^}]*clip-path:\s*inset\(0 0 50% 0\)/s);
    expect(css).toMatch(/\.solanum-flip-half\.is-bottom\s*\{[^}]*clip-path:\s*inset\(50% 0 0 0\)/s);
    expect(css).toMatch(/\.solanum-flip-half\s*\{[^}]*backface-visibility:\s*hidden/s);
  });

  it("keeps what is behind the folding half out of sight until its turn, since glyphs have no card to hide it", () => {
    // The new top shows only once the old top has folded most of the way.
    expect(css).toMatch(
      /@keyframes solanum-flip-reveal\s*\{\s*from,\s*55%\s*\{[^}]*opacity:\s*0[^}]*\}\s*56%,\s*to\s*\{[^}]*opacity:\s*1/s,
    );
    expect(css).toMatch(
      /\.solanum-flip-half\.is-static\.is-top\s*\{[^}]*animation:\s*solanum-flip-reveal/s,
    );
    // The old bottom goes the moment the new bottom starts to fall, after the first half.
    expect(css).toMatch(/@keyframes solanum-flip-vanish\s*\{\s*to\s*\{[^}]*opacity:\s*0/s);
    expect(css).toMatch(
      /\.solanum-flip-half\.is-static\.is-bottom\s*\{[^}]*animation:\s*solanum-flip-vanish[^;]*calc\(var\(--flip-seconds\) \/ 2\)/s,
    );
  });
});
