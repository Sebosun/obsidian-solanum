import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { App } from "@/components/app/App";
import type { Screen, SolanumHost } from "@/types/host";

export const VIEW_TYPE_SOLANUM = "solanum-timer";
export const VIEW_TYPE_HARVEST = "solanum-harvest";

/** How Obsidian presents each screen's view. */
const SCREEN_VIEWS: Record<Screen, { type: string; title: string; icon: string }> = {
  timer: { type: VIEW_TYPE_SOLANUM, title: "Solanum", icon: "timer" },
  harvest: { type: VIEW_TYPE_HARVEST, title: "Solanum Harvest", icon: "sprout" },
};

export class SolanumView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private host: SolanumHost,
  ) {
    super(leaf);
  }

  // ItemView reads metadata during super(), before instance fields exist.
  protected get screen(): Screen {
    return "timer";
  }

  getViewType(): string {
    return SCREEN_VIEWS[this.screen].type;
  }

  getDisplayText(): string {
    return SCREEN_VIEWS[this.screen].title;
  }

  getIcon(): string {
    return SCREEN_VIEWS[this.screen].icon;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("solanum-view");
    this.root = createRoot(this.contentEl);
    this.root.render(<App host={this.host} screen={this.screen} />);
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}

export class HarvestView extends SolanumView {
  protected override get screen(): Screen {
    return "harvest";
  }
}
