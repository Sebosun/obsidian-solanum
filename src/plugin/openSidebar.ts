import type { Workspace } from "obsidian";
import { VIEW_TYPE_HARVEST, VIEW_TYPE_SOLANUM } from "@/views/SolanumView";
import type { Screen } from "@/types/host";

/** Shows the screen's view in the right sidebar, opening a leaf for it if it has none. */
export async function openSidebar(
  workspace: Workspace,
  screen: Screen,
  reveal: boolean,
): Promise<void> {
  const type = screen === "timer" ? VIEW_TYPE_SOLANUM : VIEW_TYPE_HARVEST;
  let leaf = workspace.getLeavesOfType(type)[0];

  if (!leaf) {
    const rightLeaf = workspace.getRightLeaf(true);
    if (!rightLeaf) return;

    await rightLeaf.setViewState({ type, active: true });
    leaf = rightLeaf;
  }

  if (reveal) await workspace.revealLeaf(leaf);
}
