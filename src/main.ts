import { Plugin } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM } from "./view";

export default class SolanumPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_SOLANUM, (leaf) => new SolanumView(leaf));

    this.addRibbonIcon("timer", "Open Solanum", () => {
      void this.openSidebar(true);
    });

    this.addCommand({
      id: "open-sidebar",
      name: "Open timer sidebar",
      callback: () => {
        void this.openSidebar(true);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      void this.openSidebar(false);
    });
  }

  private async openSidebar(reveal: boolean): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_SOLANUM)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;

      await rightLeaf.setViewState({ type: VIEW_TYPE_SOLANUM, active: true });
      leaf = rightLeaf;
    }

    if (reveal) await workspace.revealLeaf(leaf);
  }
}
