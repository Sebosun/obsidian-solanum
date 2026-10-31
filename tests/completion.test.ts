import { describe, expect, it } from "vitest";
import { TimerService } from "../src/lib/timer/TimerService";
import type { CompletionEvent, Revision } from "../src/lib/timer/types";
import { celebrationFrame } from "../src/lib/scene/celebration";

describe("one-shot completion effects", () => {
  it("emits only a new live completion, never cancellation or recovered history", async () => {
    let now = 1_000_000;
    let sequence = 0;
    const files = new Map<string, Revision>();
    const store = {
      readAll: async () => [...files.values()],
      append: async (r: Revision) => {
        files.set(r.id, r);
      },
    };
    const timer = new TimerService(store, { now: () => now, id: () => `effect-${++sequence}` });
    const events: CompletionEvent[] = [];
    timer.subscribeCompletion((event) => events.push(event));
    const options = {
      durationMs: 300_000,
      breakMs: 300_000,
      autoBreak: false,
      tags: [],
      notePath: null,
    };
    const cancelled = await timer.start(options);
    await timer.cancel(cancelled);
    expect(events).toEqual([]);
    await timer.start(options);
    now += 300_000;
    await timer.tick();
    await timer.tick();
    await timer.refresh();
    expect(events).toHaveLength(1);
    expect(events[0].phase).toBe("focus");
    const recovered = new TimerService(store, { now: () => now + 900_000, id: () => "recovered" });
    recovered.subscribeCompletion((event) => events.push(event));
    await recovered.refresh();
    expect(events).toHaveLength(1);
  });

  it("returns to rest after a restrained flourish and skips reduced motion", () => {
    const middle = celebrationFrame(0.5);
    expect(middle.lift).toBeGreaterThan(0);
    expect(middle.scale).toBeLessThan(1.05);
    expect(celebrationFrame(2)).toMatchObject({ lift: 0, scale: 1, ringOpacity: 0, done: true });
    expect(celebrationFrame(0.5, true)).toMatchObject({ lift: 0, scale: 1, done: true });
  });
});
