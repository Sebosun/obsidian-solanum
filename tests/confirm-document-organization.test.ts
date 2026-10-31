import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import type { DayNoteMigrationPlan } from "@/lib/notes/migration";

const modal = vi.hoisted(() => ({ messages: [] as string[] }));
vi.mock("@/plugin/ConfirmMoveModal", () => ({
  confirmMove: async (_app: unknown, message: string) => {
    modal.messages.push(message);
    return true;
  },
}));
import { confirmDocumentOrganization } from "@/plugin/confirmDocumentOrganization";

const app = {} as App;
const plan = (patch: Partial<DayNoteMigrationPlan>): DayNoteMigrationPlan => ({
  from: "Solanum/days",
  to: "Solanum",
  moves: [],
  conflicts: [],
  leftBehind: [],
  ...patch,
});

describe("confirming a document move", () => {
  it("rejects the promise, rather than throwing before one exists, when documents would collide", async () => {
    const asked = confirmDocumentOrganization(
      app,
      plan({ conflicts: ["Solanum/2026/10/2026-10-31.md"] }),
    );
    expect(asked).toBeInstanceOf(Promise);
    await expect(asked).rejects.toThrow(
      "Documents already exist at Solanum/2026/10/2026-10-31.md. Nothing was moved.",
    );
    expect(modal.messages).toEqual([]);
  });

  it("previews the first moves and counts the rest", async () => {
    const moves = Array.from({ length: 12 }, (_, index) => ({
      from: `Solanum/days/2026-10-${String(index + 1).padStart(2, "0")}.md`,
      to: `Solanum/2026/10/2026-10-${String(index + 1).padStart(2, "0")}.md`,
    }));
    expect(await confirmDocumentOrganization(app, plan({ moves, leftBehind: ["x.txt"] }))).toBe(
      true,
    );
    const [message] = modal.messages;
    expect(message).toContain("Move 12 documents from Solanum/days into Solanum/YYYY/MM/");
    expect(message).toContain("1 unrelated files stay where they are");
    expect(message).toContain("Solanum/days/2026-10-10.md → Solanum/2026/10/2026-10-10.md");
    expect(message).not.toContain("2026-10-11.md");
    expect(message).toContain("… and 2 more.");
  });
});
