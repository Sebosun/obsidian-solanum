import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./App";

export const VIEW_TYPE_SOLANUM = "solanum-timer";

export class SolanumView extends ItemView {
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_SOLANUM;
  }

  getDisplayText(): string {
    return "Solanum";
  }

  getIcon(): string {
    return "timer";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("solanum-view");
    this.root = createRoot(this.contentEl);
    this.root.render(<App />);
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
