import { describe, expect, it, vi } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import type { SolanumHost } from "@/types/host";

vi.mock("obsidian", () => ({
  ItemView: class {
    constructor() {
      // Obsidian reads view metadata before the subclass constructor finishes.
      expect(this.getViewType()).toBeTruthy();
      expect(this.getDisplayText()).toBeTruthy();
      expect(this.getIcon()).toBeTruthy();
    }
    getViewType(): string {
      return "";
    }
    getDisplayText(): string {
      return "";
    }
    getIcon(): string {
      return "";
    }
  },
}));
vi.mock("@/components/app/App", () => ({ App: () => null }));

import { HarvestView, SolanumView } from "@/views/SolanumView";

describe("view construction", () => {
  it("provides timer metadata during the ItemView constructor", () => {
    const view = new SolanumView({} as WorkspaceLeaf, {} as SolanumHost);
    expect(view.getViewType()).toBe("solanum-timer");
    expect(view.getDisplayText()).toBe("Solanum");
    expect(view.getIcon()).toBe("timer");
  });

  it("provides harvest metadata during the ItemView constructor", () => {
    const view = new HarvestView({} as WorkspaceLeaf, {} as SolanumHost);
    expect(view.getViewType()).toBe("solanum-harvest");
    expect(view.getDisplayText()).toBe("Solanum Harvest");
    expect(view.getIcon()).toBe("sprout");
  });
});
