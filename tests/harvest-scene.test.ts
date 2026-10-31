import { describe, expect, it } from "vitest";
import { buildHarvestMonth } from "@/lib/harvest/model";
import { seedMonth } from "@/lib/debug/seeder";

describe("3D harvest scene from persisted history", () => {
  const now = new Date(2026, 10, 1).getTime();
  const sessions = seedMonth(new Date(2026, 9, 1), now, ["Project.md"]);

  it("prefills correctly positioned calendar plots and keeps the original crop and details", () => {
    const days = buildHarvestMonth(sessions, new Date(2026, 9, 1));
    expect(days).toHaveLength(31);
    expect(days[0].key).toBe("2026-10-01");
    expect(days[0].column).toBe(4); // Thursday
    expect(days[30].column).toBe(6);
    expect(days[30].row).toBe(4);
    expect(days[3].items).toEqual([]);
    const day = days.find((d) => d.items.length > 0)!;
    expect(day.items[0].session.notePath).toBe("Project.md");
    expect(day.items[0].session.crop).toBe(
      sessions.find((s) => s.sessionId === day.items[0].session.sessionId)!.crop,
    );
  });

  it("bounds render cost without dropping full details or focused totals", () => {
    const session = sessions[0];
    const many = Array.from({ length: 30 }, (_, i) => ({ ...session, sessionId: `many-${i}` }));
    const day = buildHarvestMonth(many, new Date(2026, 9, 1)).find((d) => d.entries.length)!;
    expect(day.items.length).toBeLessThanOrEqual(9);
    expect(day.entries).toHaveLength(30);
    expect(day.overflow).toBeGreaterThan(0);
    expect(new Set(day.items.map((i) => i.key)).size).toBe(day.items.length);
    expect(day.minutes).toBe((30 * session.durationMs) / 60_000);
  });

  it("applies filters before building visible 3D crops and their details", () => {
    const days = buildHarvestMonth(sessions, new Date(2026, 9, 1), { tag: "missing" });
    expect(
      days.every((d) => d.items.length === 0 && d.entries.length === 0 && d.minutes === 0),
    ).toBe(true);
  });
});
