// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSunClock } from "@/hooks/useSunClock";
import { SUN_CLOCK } from "@/lib/scene/constants";

// The fake timers run animation frames every 16 ms.
const FRAME_MS = 16;
const FRAME = FRAME_MS / 1000;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

interface Props {
  target: number;
  rate: number;
  reduced?: boolean;
  active?: boolean;
}

/** The sun's progress after each of `frames` single animation frames. */
function frames(count: number, read: () => number): number[] {
  const seen: number[] = [];
  for (let i = 0; i < count; i += 1) {
    act(() => {
      vi.advanceTimersByTime(FRAME_MS);
    });
    seen.push(read());
  }
  return seen;
}

function mount(initial: Props) {
  const view = renderHook(
    (props: Props) => useSunClock(props.target, props.rate, props.reduced ?? false, props.active),
    { initialProps: initial },
  );
  const read = () => view.result.current.sun.current.progress;
  return { ...view, read };
}

describe("a sun that keeps moving between clock ticks", () => {
  it("advances a little every frame instead of once a second", () => {
    const rate = 1 / 100; // a 100 second phase
    const { read } = mount({ target: 0.2, rate });
    const seen = frames(60, read);
    const steps = seen.slice(1).map((value, i) => value - seen[i]);
    expect(steps.filter((step) => step <= 0)).toEqual([]);
    const steady = steps.slice(30);
    const mean = steady.reduce((a, b) => a + b, 0) / steady.length;
    expect(mean).toBeCloseTo(rate * FRAME, 5);
    expect(Math.max(...steady)).toBeLessThan(mean * 1.1);
    expect(Math.min(...steady)).toBeGreaterThan(mean * 0.9);
    expect(seen[seen.length - 1]).toBeCloseTo(0.2 + rate - rate / SUN_CLOCK.smoothing, 3);
  });

  it("follows each tick of the clock without jumping", () => {
    const rate = 1 / 100;
    const { read, rerender } = mount({ target: 0.2, rate });
    const first = frames(60, read);
    const before = first[first.length - 1];
    rerender({ target: 0.2 + rate * 1.02, rate }); // the tick lands a hair late
    const after = frames(2, read);
    expect(Math.abs(after[after.length - 1] - before)).toBeLessThan(rate * 0.2);
  });

  it("settles on the target and stays there when paused", () => {
    const { read, rerender } = mount({ target: 0.3, rate: 0 });
    rerender({ target: 0.35, rate: 0 });
    const settled = frames(120, read);
    expect(settled[settled.length - 1]).toBeCloseTo(0.35, 3);
    const later = frames(60, read);
    expect(later[later.length - 1]).toBeCloseTo(0.35, 3);
  });

  it("stops asking for frames once it has settled, so a paused clock costs nothing", () => {
    const { read, rerender } = mount({ target: 0.3, rate: 0 });
    rerender({ target: 0.35, rate: 0 });
    frames(240, read);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("glides to a new phase's dawn instead of snapping back", () => {
    const { read, rerender } = mount({ target: 0.98, rate: 0 });
    rerender({ target: 0, rate: 0 });
    const early = frames(3, read);
    expect(early[early.length - 1]).toBeGreaterThan(0.5);
    const rest = frames(180, read);
    expect(rest[rest.length - 1]).toBeLessThan(0.01);
    expect(rest.every((value, i) => i === 0 || value <= rest[i - 1])).toBe(true);
  });

  it("never passes the end of the arc", () => {
    const { read } = mount({ target: 0.99, rate: 0.5 });
    expect(Math.max(...frames(240, read))).toBeLessThanOrEqual(1);
  });

  it("just shows the target under reduced motion, and runs no frames at all", () => {
    const { read, rerender } = mount({ target: 0.4, rate: 0.5, reduced: true });
    expect(new Set(frames(30, read))).toEqual(new Set([0.4]));
    rerender({ target: 0.45, rate: 0.5, reduced: true });
    expect(read()).toBe(0.45);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the target and runs no frames while the scene is off screen", () => {
    const { read, rerender } = mount({ target: 0.4, rate: 0.5, active: false });
    frames(30, read);
    expect(read()).toBe(0.4);
    expect(vi.getTimerCount()).toBe(0);
    rerender({ target: 0.4, rate: 0.5, active: true });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("tells whoever listens about every new state, until they stop", () => {
    const { result } = mount({ target: 0.2, rate: 0.01 });
    const seen: number[] = [];
    const stop = result.current.subscribe((state) => seen.push(state.progress));
    frames(3, () => 0);
    expect(seen).toHaveLength(3);
    stop();
    frames(3, () => 0);
    expect(seen).toHaveLength(3);
  });

  it("stops its frames when it leaves the page", () => {
    const { unmount } = mount({ target: 0.2, rate: 0.5 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
