import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { App } from "@/components/app/App";
import type { SolanumHost } from "@/types/host";

export const VIEW_TYPE_SOLANUM = "solanum-timer";
export const VIEW_TYPE_HARVEST = "solanum-harvest";

export class SolanumView extends ItemView {
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private host: SolanumHost,
    private screen: "timer" | "harvest",
  ) {
    super(leaf);
  }

  getViewType(): string {
    return this.screen === "timer" ? VIEW_TYPE_SOLANUM : VIEW_TYPE_HARVEST;
  }

  getDisplayText(): string {
    return this.screen === "timer" ? "Solanum" : "Solanum Harvest";
  }

  getIcon(): string {
    return this.screen === "timer" ? "timer" : "sprout";
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
